/**
 * Kapaklı Tenis Akademi — Google Apps Script sunucu kodu
 *
 * Veritabanı: bu betiğin bağlı olduğu Google E-Tablo. Her tablo ayrı bir sayfadır
 * (Kullanıcılar = "Users", Öğrenciler = "Students" ...). Sayfalar ilk çalıştırmada kendiliğinden oluşur.
 * Arayüz: Index.html (tek dosya). Arayüz sunucuyla sadece api() fonksiyonu üzerinden konuşur.
 *
 * Kurulum için KURULUM.md dosyasına bakın.
 */

const TZ = 'Europe/Istanbul';
const SESSION_DAYS = 7;

// ------------------------------------------------------------------ Tablolar
const SCHEMA = {
  Users: ['id', 'name', 'email', 'phone', 'passwordHash', 'role', 'active', 'createdAt', 'hourlyRate', 'notifyConsent'],
  Students: ['id', 'firstName', 'lastName', 'birthDate', 'phone', 'level', 'monthlyFee', 'notes', 'active', 'createdAt', 'parentId'],
  Courts: ['id', 'name', 'surface', 'indoor', 'active'],
  Groups: ['id', 'name', 'level', 'dayOfWeek', 'startTime', 'endTime', 'capacity', 'active', 'coachId', 'courtId'],
  GroupMembers: ['groupId', 'studentId'],
  Lessons: ['id', 'date', 'note', 'createdAt', 'groupId', 'takenById', 'coachId', 'minutes'],
  Attendance: ['lessonId', 'studentId', 'status'],
  Reservations: ['id', 'date', 'startTime', 'endTime', 'type', 'status', 'note', 'createdAt', 'courtId', 'userId', 'coachId', 'studentId'],
  Payments: ['id', 'period', 'amount', 'dueDate', 'paidAmount', 'paidAt', 'method', 'note', 'createdAt', 'studentId'],
  Evaluations: ['id', 'date', 'term', 'scores', 'strengths', 'improve', 'goals', 'createdAt', 'studentId', 'coachId'],
  Notifications: ['id', 'channel', 'kind', 'phone', 'body', 'status', 'error', 'dedupeKey', 'createdAt', 'userId', 'studentId'],
  Settings: ['key', 'value'],
  LoginAttempts: ['email', 'count', 'firstAt', 'lockedUntil'],
  Sessions: ['token', 'userId', 'expiresAt'],
};
const NUMS = {
  Users: ['hourlyRate'], Students: ['monthlyFee'], Groups: ['dayOfWeek', 'capacity'], Lessons: ['minutes'],
  Payments: ['amount', 'paidAmount'], LoginAttempts: ['count'],
};
const BOOLS = { Users: ['active', 'notifyConsent'], Students: ['active'], Courts: ['indoor', 'active'], Groups: ['active'] };

/** Sürüm: Index.html'deki SURUM ile aynı olmalı (farklıysa arayüz uyarı gösterir) */
const SURUM = '2026.11.10-1';

// ------------------------------------------------------------------ Web uygulaması girişi
function doGet() {
  let title = DEFAULT_SETTINGS.academy_name;
  try { title = settings_().academy_name || title; } catch (e) { /* E-Tablo yoksa varsayılan ad */ }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------------------------------ E-Tablo veritabanı katmanı
let _book = null;
const _cache = {};

function book_() {
  if (_book) return _book;
  _book = SpreadsheetApp.getActiveSpreadsheet();
  if (!_book) {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) fail_('Veritabanı E-Tablosu bulunamadı. Apps Script projesi bir E-Tablonun içinden (E-Tablo açıkken Uzantılar → Apps Script) oluşturulmalı. script.google.com üzerinden ayrı bir proje açtıysanız, kodu E-Tablonun içindeki Apps Script\'e taşıyın.');
    _book = SpreadsheetApp.openById(id);
  }
  return _book;
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheet_(name) {
  let sh = book_().getSheetByName(name);
  if (!sh) {
    sh = book_().insertSheet(name);
    const cols = SCHEMA[name];
    // Tüm sütunlar düz metin: tarih "2026-11-06", saat "17:00", telefon "0535..." olduğu gibi kalsın
    sh.getRange('A:' + colLetter_(cols.length)).setNumberFormat('@');
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return v;
}

/** Bir tablonun tüm satırları (istek boyunca önbellekte). Döndürülen nesneleri değiştirmeyin. */
function rows_(name) {
  if (_cache[name]) return _cache[name];
  const sh = sheet_(name);
  const cols = SCHEMA[name];
  const n = sh.getLastRow() - 1;
  const vals = n > 0 ? sh.getRange(2, 1, n, cols.length).getValues() : [];
  const nums = NUMS[name] || [], bools = BOOLS[name] || [];
  const list = [];
  vals.forEach(function (r, i) {
    if (r.every(function (c) { return c === '' || c === null; })) return; // boş satır
    const o = { _row: i + 2 };
    cols.forEach(function (c, j) {
      let v = cell_(r[j]);
      if (nums.indexOf(c) >= 0) v = v === '' || v === null ? 0 : Number(v);
      else if (bools.indexOf(c) >= 0) v = v === true || String(v).toUpperCase() === 'TRUE';
      else v = v === '' || v === null ? null : String(v);
      o[c] = v;
    });
    list.push(o);
  });
  _cache[name] = list;
  return list;
}

function byId_(name) {
  const m = {};
  rows_(name).forEach(function (o) { m[o.id] = o; });
  return m;
}

function toCells_(name, o) {
  return SCHEMA[name].map(function (c) {
    const v = o[c];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}

function ensureRows_(sh, need) {
  const max = sh.getMaxRows();
  if (need > max) {
    sh.insertRowsAfter(max, need - max + 200);
    sh.getRange(max + 1, 1, need - max + 200, sh.getMaxColumns()).setNumberFormat('@');
  }
}

function insert_(name, o) {
  insertMany_(name, [o]);
  return o;
}

function insertMany_(name, list) {
  if (!list.length) return;
  const sh = sheet_(name);
  const data = list.map(function (o) { return toCells_(name, o); });
  const start = sh.getLastRow() + 1;
  ensureRows_(sh, start + data.length);
  sh.getRange(start, 1, data.length, data[0].length).setValues(data);
  delete _cache[name];
}

function update_(name, row, patch) {
  const o = Object.assign({}, row, patch);
  const sh = sheet_(name);
  const cells = toCells_(name, o);
  sh.getRange(row._row, 1, 1, cells.length).setValues([cells]);
  delete _cache[name];
  return o;
}

function remove_(name, pred) {
  const rowsToDelete = rows_(name).filter(pred).map(function (o) { return o._row; }).sort(function (a, b) { return b - a; });
  const sh = sheet_(name);
  rowsToDelete.forEach(function (r) { sh.deleteRow(r); });
  delete _cache[name];
  return rowsToDelete.length;
}

function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 20); }
function nowIso_() { return new Date().toISOString(); }

// ------------------------------------------------------------------ Tarih / biçim yardımcıları
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function nowTime_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }
function period_() { return today_().slice(0, 7); }
function parseD_(d) { const p = d.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function fmtD_(d) { return d.toISOString().slice(0, 10); }
function addDays_(d, n) { const x = parseD_(d); x.setUTCDate(x.getUTCDate() + n); return fmtD_(x); }
function dow_(d) { const w = parseD_(d).getUTCDay(); return w === 0 ? 7 : w; }
function weekStart_(d) { return addDays_(d, 1 - dow_(d)); }
function addMonths_(p, n) { const a = p.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1 + n, 1)).toISOString().slice(0, 7); }
function monthRange_(p) { return [p + '-01', addDays_(addMonths_(p, 1) + '-01', -1)]; }
function isDate_(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(parseD_(d).getTime()); }
function isPeriod_(p) { return typeof p === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(p); }
function isTime_(t) { return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function minutes_(a, b) { const m = function (t) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }; return Math.max(0, m(b) - m(a)); }
function overlaps_(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYNAMES = ['', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
function periodLabel_(p) { const a = p.split('-').map(Number); return MONTHS[a[1] - 1] + ' ' + a[0]; }
function dateLabel_(d, withDay) {
  const a = d.split('-').map(Number);
  const s = a[2] + ' ' + MONTHS[a[1] - 1] + ' ' + a[0];
  return withDay === false ? s : s + ', ' + DAYNAMES[dow_(d)];
}
function tl_(n) { return '₺' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fullName_(s) { return s ? s.firstName + ' ' + s.lastName : ''; }
function nm_(o) { return o ? o.name : null; }
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function opt_(v) { const s = str_(v); return s === '' ? null : s; }
function int_(v, def) { const n = parseInt(str_(v), 10); return isFinite(n) ? n : (def || 0); }

const LEVELS = ['BASLANGIC', 'ORTA', 'ILERI', 'PERFORMANS'];
const LEVEL_LABEL = { BASLANGIC: 'Başlangıç', ORTA: 'Orta', ILERI: 'İleri', PERFORMANS: 'Performans' };
const OPEN_FROM = '08:00', OPEN_UNTIL = '23:00';
const SKILLS = [['forehand', 'Forehand'], ['backhand', 'Backhand'], ['servis', 'Servis'], ['vole', 'Vole ve smaç'],
  ['ayak', 'Ayak hareketleri'], ['kondisyon', 'Kondisyon ve koordinasyon'], ['taktik', 'Oyun bilgisi ve taktik'], ['tutum', 'Disiplin ve motivasyon']];

function fail_(msg) { const e = new Error(msg); e.userError = true; throw e; }

// ------------------------------------------------------------------ Şifre ve oturum
function derive_(pw, salt) {
  const key = Utilities.newBlob(salt).getBytes();
  let h = Utilities.computeHmacSha256Signature(Utilities.newBlob(pw).getBytes(), key);
  for (let i = 0; i < 2000; i++) h = Utilities.computeHmacSha256Signature(h, key);
  return Utilities.base64Encode(h);
}
function hashPassword_(pw) { const salt = Utilities.getUuid(); return ['h1', salt, derive_(pw, salt)].join('$'); }
function verifyPassword_(pw, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 3 || p[0] !== 'h1') return false;
  const a = derive_(pw, p[1]), b = p[2];
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function publicUser_(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

function auth_(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  let userId = cache.get('s:' + token);
  if (!userId) {
    const s = rows_('Sessions').filter(function (x) { return x.token === token; })[0];
    if (!s || s.expiresAt < nowIso_()) return null;
    userId = s.userId;
    cache.put('s:' + token, userId, 21600);
  }
  const u = byId_('Users')[userId];
  if (!u || !u.active) return null;
  return u;
}

/** Yönetim yetkisi: yönetici ve antrenörler aynı yetkilere sahiptir */
function adm_(u) { return !!u && (u.role === 'ADMIN' || u.role === 'COACH'); }

function need_(user, roles) {
  if (roles.indexOf(user.role) < 0) fail_('Bu işlem için yetkiniz yok.');
}

// ------------------------------------------------------------------ Tek giriş noktası
/**
 * Arayüzün çağırdığı tek fonksiyon: api("students.list", {...}, token)
 * Yanıt JSON metnidir: { ok: true, data } ya da { ok: false, error, auth? }
 */
function api(action, args, token) {
  try {
    const a = ACTIONS[action];
    if (!a) fail_('Bilinmeyen işlem: ' + action);
    let user = null;
    if (!a.public) {
      user = auth_(token);
      if (!user) return JSON.stringify({ ok: false, auth: true, error: 'Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.' });
      if (a.roles) need_(user, a.roles);
    }
    let lock = null;
    if (a.write) { lock = LockService.getScriptLock(); lock.waitLock(25000); }
    try {
      const data = a.fn(args || {}, user, token);
      return JSON.stringify({ ok: true, data: data === undefined ? null : data });
    } finally {
      if (lock) lock.releaseLock();
    }
  } catch (e) {
    const msg = e && e.userError ? e.message : 'Beklenmeyen bir hata oluştu: ' + (e && e.message ? e.message : String(e));
    return JSON.stringify({ ok: false, error: msg });
  }
}

const ADMIN = ['ADMIN', 'COACH'], STAFF = ['ADMIN', 'COACH'];
const ACTIONS = {
  // giriş / oturum
  'auth.status': { public: true, fn: authStatus_ },
  'auth.setup': { public: true, write: true, fn: authSetup_ },
  'auth.login': { public: true, write: true, fn: authLogin_ },
  'auth.logout': { public: true, write: true, fn: authLogout_ },
  'auth.me': { fn: function (a, u) { return Object.assign(publicUser_(u), { brand: brand_(), version: SURUM }); } },
  'auth.changePassword': { write: true, fn: changePassword_ },
  // panolar
  'dashboard': { fn: dashboard_ },
  'dashboard.pending': { roles: ADMIN, fn: pendingCounts_ },
  // öğrenciler
  'students.list': { roles: ADMIN, fn: studentsList_ },
  'students.get': { roles: ADMIN, fn: studentGet_ },
  'students.form': { roles: ADMIN, fn: function () { return { parents: parentsList_() }; } },
  'students.save': { roles: ADMIN, write: true, fn: studentSave_ },
  // kullanıcılar
  'users.list': { roles: ADMIN, fn: usersList_ },
  'users.get': { roles: ADMIN, fn: userGet_ },
  'users.save': { roles: ADMIN, write: true, fn: userSave_ },
  // gruplar
  'groups.list': { roles: ADMIN, fn: groupsList_ },
  'groups.get': { roles: ADMIN, fn: groupGet_ },
  'groups.form': { roles: ADMIN, fn: groupForm_ },
  'groups.save': { roles: ADMIN, write: true, fn: groupSave_ },
  'groups.addMember': { roles: ADMIN, write: true, fn: groupAddMember_ },
  'groups.removeMember': { roles: ADMIN, write: true, fn: groupRemoveMember_ },
  // program ve yoklama
  'schedule.week': { fn: scheduleWeek_ },
  'attendance.day': { roles: STAFF, fn: attendanceDay_ },
  'attendance.get': { roles: STAFF, fn: attendanceGet_ },
  'attendance.save': { roles: STAFF, write: true, fn: attendanceSave_ },
  // kortlar
  'courts.day': { fn: courtsDay_ },
  'reservations.create': { write: true, fn: reservationCreate_ },
  'reservations.cancel': { write: true, fn: reservationCancel_ },
  'reservations.approve': { roles: ADMIN, write: true, fn: reservationApprove_ },
  'courts.create': { roles: ADMIN, write: true, fn: courtCreate_ },
  'courts.toggle': { roles: ADMIN, write: true, fn: courtToggle_ },
  // aidatlar
  'payments.list': { roles: ADMIN, fn: paymentsList_ },
  'payments.generate': { roles: ADMIN, write: true, fn: paymentsGenerate_ },
  'payments.record': { roles: ADMIN, write: true, fn: paymentRecord_ },
  'payments.reset': { roles: ADMIN, write: true, fn: paymentReset_ },
  'payments.remove': { roles: ADMIN, write: true, fn: paymentRemove_ },
  // WhatsApp hatırlatmaları
  'reminders.view': { roles: ADMIN, fn: remindersView_ },
  'reminders.log': { roles: STAFF, write: true, fn: remindersLog_ },
  'reminders.send': { roles: ADMIN, write: true, fn: remindersSend_ },
  'settings.templates': { roles: ADMIN, write: true, fn: saveTemplates_ },
  'settings.automation': { roles: ADMIN, write: true, fn: saveAutomation_ },
  'settings.branding': { roles: ADMIN, write: true, fn: saveBranding_ },
  // karne
  'karne.list': { roles: STAFF, fn: karneList_ },
  'karne.get': { fn: karneGet_ },
  'karne.form': { roles: STAFF, fn: karneForm_ },
  'karne.save': { roles: STAFF, write: true, fn: karneSave_ },
  'karne.remove': { roles: STAFF, write: true, fn: karneRemove_ },
  // raporlar
  'reports.list': { roles: STAFF, fn: reportsList_ },
  'reports.coach': { roles: STAFF, fn: reportsCoach_ },
  'reports.toSheet': { roles: STAFF, write: true, fn: reportsToSheet_ },
};

// ------------------------------------------------------------------ Giriş, kurulum, şifre
function authStatus_() { return { needsSetup: rows_('Users').length === 0, brand: brand_(), version: SURUM }; }

function createSession_(u) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const exp = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  insert_('Sessions', { token: token, userId: u.id, expiresAt: exp });
  // süresi geçmiş oturumları temizle
  const now = nowIso_();
  if (rows_('Sessions').some(function (s) { return s.expiresAt < now; })) remove_('Sessions', function (s) { return s.expiresAt < now; });
  return { token: token, user: publicUser_(u) };
}

function authSetup_(a) {
  if (rows_('Users').length > 0) fail_('Kurulum zaten yapılmış. Giriş sayfasını kullanın.');
  const name = str_(a.name), email = str_(a.email).toLowerCase(), pw = str_(a.password);
  if (!name || !email) fail_('Ad ve e-posta zorunlu.');
  if (pw.length < 8) fail_('Şifre en az 8 karakter olmalı.');
  if (pw !== str_(a.password2)) fail_('Şifreler aynı değil.');
  const u = insert_('Users', { id: newId_(), name: name, email: email, role: 'ADMIN', passwordHash: hashPassword_(pw), active: true, createdAt: nowIso_(), hourlyRate: 0, notifyConsent: true });
  ensureCourts_();
  return createSession_(u);
}

function ensureCourts_() {
  if (rows_('Courts').length) return;
  insertMany_('Courts', [
    { id: newId_(), name: 'Kort 1', surface: 'TOPRAK', indoor: false, active: true },
    { id: newId_(), name: 'Kort 2', surface: 'TOPRAK', indoor: false, active: true },
  ]);
}

// Kaba kuvvet koruması: aynı e-postayla 15 dakika içinde 5 hatalı denemede giriş 15 dakika kilitlenir
function authLogin_(a) {
  const email = str_(a.email).toLowerCase(), pw = str_(a.password);
  if (!email || !pw) fail_('E-posta ve şifre girin.');
  const now = Date.now();
  const att = rows_('LoginAttempts').filter(function (x) { return x.email === email; })[0];
  if (att && att.lockedUntil && Date.parse(att.lockedUntil) > now) {
    fail_('Çok fazla hatalı deneme yapıldı. Güvenliğiniz için ' + Math.ceil((Date.parse(att.lockedUntil) - now) / 60000) + ' dakika sonra tekrar deneyin.');
  }
  const u = rows_('Users').filter(function (x) { return x.email === email; })[0];
  if (!u || !u.active || !verifyPassword_(pw, u.passwordHash)) {
    const fresh = !att || Date.parse(att.firstAt) < now - 15 * 60000 || !!att.lockedUntil;
    const count = fresh ? 1 : att.count + 1;
    const locked = count >= 5;
    const data = { email: email, count: locked ? 0 : count, firstAt: fresh ? new Date(now).toISOString() : att.firstAt, lockedUntil: locked ? new Date(now + 15 * 60000).toISOString() : null };
    if (att) update_('LoginAttempts', att, data); else insert_('LoginAttempts', data);
    if (locked) fail_('Çok fazla hatalı deneme yapıldı. Güvenliğiniz için 15 dakika sonra tekrar deneyin.');
    const left = 5 - count;
    fail_(left <= 2 ? 'E-posta veya şifre hatalı. ' + left + ' deneme hakkınız kaldı.' : 'E-posta veya şifre hatalı.');
  }
  if (att) remove_('LoginAttempts', function (x) { return x.email === email; });
  return createSession_(u);
}

function authLogout_(a, u, token) {
  if (token) {
    remove_('Sessions', function (s) { return s.token === token; });
    CacheService.getScriptCache().remove('s:' + token);
  }
  return true;
}

function changePassword_(a, u) {
  const next = str_(a.next);
  if (next.length < 8) fail_('Yeni şifre en az 8 karakter olmalı.');
  if (!verifyPassword_(str_(a.current), u.passwordHash)) fail_('Mevcut şifre hatalı.');
  update_('Users', u, { passwordHash: hashPassword_(next) });
  return { message: 'Şifreniz değiştirildi.' };
}

// ------------------------------------------------------------------ Yardımcı sorgular
function activeMembers_(groupId) {
  const st = byId_('Students');
  return rows_('GroupMembers').filter(function (m) { return m.groupId === groupId && st[m.studentId] && st[m.studentId].active; });
}

function paymentStatus_(p) {
  if (p.paidAmount >= p.amount) return 'ODENDI';
  if (p.dueDate < today_()) return 'GECIKTI';
  if (p.paidAmount > 0) return 'KISMI';
  return 'BEKLIYOR';
}

function parentsList_() {
  return rows_('Users').filter(function (u) { return u.role === 'PARENT' && u.active; })
    .map(function (u) { return { id: u.id, name: u.name, phone: u.phone }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
}

function coachesList_() {
  return rows_('Users').filter(function (u) { return u.role === 'COACH' && u.active; })
    .map(function (u) { return { id: u.id, name: u.name }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
}

function sortStudents_(list) { return list.sort(function (a, b) { return fullName_(a).localeCompare(fullName_(b), 'tr'); }); }

/** Birden çok günün dersleri ve rezervasyonları: { "YYYY-AA-GG": [...] } */
function rangeSchedule_(dates, opt) {
  opt = opt || {};
  const users = byId_('Users'), courts = byId_('Courts'), students = byId_('Students');
  const members = rows_('GroupMembers'), lessons = rows_('Lessons');
  let groups = rows_('Groups').filter(function (g) { return g.active && (!opt.coachId || g.coachId === opt.coachId); });
  if (opt.studentIds) {
    groups = groups.filter(function (g) { return members.some(function (m) { return m.groupId === g.id && opt.studentIds.indexOf(m.studentId) >= 0; }); });
  }
  const res = rows_('Reservations').filter(function (r) {
    return dates.indexOf(r.date) >= 0 && r.status !== 'IPTAL' && (!opt.coachId || r.coachId === opt.coachId)
      && (!opt.studentIds || opt.studentIds.indexOf(r.studentId) >= 0);
  });
  const out = {};
  dates.forEach(function (d) {
    const dw = dow_(d);
    const items = groups.filter(function (g) { return g.dayOfWeek === dw; }).map(function (g) {
      return {
        kind: 'GROUP', key: 'g' + g.id, start: g.startTime, end: g.endTime, title: g.name,
        court: nm_(courts[g.courtId]), coach: nm_(users[g.coachId]), groupId: g.id,
        memberCount: activeMembers_(g.id).length,
        lessonTaken: lessons.some(function (l) { return l.groupId === g.id && l.date === d; }),
      };
    }).concat(res.filter(function (r) { return r.date === d; }).map(function (r) {
      const s = students[r.studentId];
      return {
        kind: 'RES', key: 'r' + r.id, start: r.startTime, end: r.endTime,
        title: r.type === 'OZEL_DERS' ? 'Özel ders' + (s ? ' · ' + fullName_(s) : '') : 'Kort kiralama · ' + (nm_(users[r.userId]) || ''),
        court: nm_(courts[r.courtId]), coach: nm_(users[r.coachId]), resType: r.type, resStatus: r.status,
      };
    }));
    out[d] = items.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  });
  return out;
}

// ------------------------------------------------------------------ Panolar
function dashboard_(a, u) {
  const today = today_();
  if (adm_(u)) {
    const period = period_();
    const pays = rows_('Payments'), st = byId_('Students'), users = byId_('Users'), courts = byId_('Courts');
    const month = pays.filter(function (p) { return p.period === period; });
    const overdue = pays.filter(function (p) { return p.dueDate < today && p.paidAmount < p.amount; })
      .sort(function (x, y) { return x.dueDate < y.dueDate ? -1 : 1; })
      .map(function (p) { return { id: p.id, studentId: p.studentId, student: fullName_(st[p.studentId]), period: p.period, periodLabel: periodLabel_(p.period), due: p.amount - p.paidAmount }; });
    const pending = rows_('Reservations').filter(function (r) { return r.status === 'BEKLEMEDE' && r.date >= today; })
      .sort(function (x, y) { return (x.date + x.startTime) < (y.date + y.startTime) ? -1 : 1; })
      .map(function (r) {
        return { id: r.id, type: r.type, court: nm_(courts[r.courtId]), date: r.date, dateLabel: dateLabel_(r.date), start: r.startTime, end: r.endTime,
          user: nm_(users[r.userId]), student: fullName_(st[r.studentId]), note: r.note };
      });
    return {
      role: 'ADMIN', today: today, todayLabel: dateLabel_(today), period: period, periodLabel: periodLabel_(period),
      activeStudents: rows_('Students').filter(function (s) { return s.active; }).length,
      activeGroups: rows_('Groups').filter(function (g) { return g.active; }).length,
      expected: month.reduce(function (s, p) { return s + p.amount; }, 0),
      collected: month.reduce(function (s, p) { return s + p.paidAmount; }, 0),
      overdue: overdue, pending: pending, schedule: rangeSchedule_([today])[today],
    };
  }
  if (u.role === 'COACH') {
    const tomorrow = addDays_(today, 1);
    const byDay = rangeSchedule_([today, tomorrow], { coachId: u.id });
    const courts = byId_('Courts');
    const groups = rows_('Groups').filter(function (g) { return g.coachId === u.id && g.active; })
      .sort(function (x, y) { return x.dayOfWeek - y.dayOfWeek || (x.startTime < y.startTime ? -1 : 1); })
      .map(function (g) { return { id: g.id, name: g.name, dayOfWeek: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime, level: g.level, court: nm_(courts[g.courtId]), count: activeMembers_(g.id).length, capacity: g.capacity }; });
    return {
      role: 'COACH', today: today, todayLabel: dateLabel_(today), tomorrow: tomorrow, tomorrowLabel: dateLabel_(tomorrow),
      todayItems: byDay[today], tomorrowItems: byDay[tomorrow], groups: groups,
      students: groups.reduce(function (s, g) { return s + g.count; }, 0),
      missing: byDay[today].filter(function (i) { return i.groupId && !i.lessonTaken; }).length,
    };
  }
  // VELİ
  const users = byId_('Users'), courts = byId_('Courts'), groups = byId_('Groups'), lessons = byId_('Lessons');
  const kids = sortStudents_(rows_('Students').filter(function (s) { return s.parentId === u.id && s.active; }));
  const children = kids.map(function (c) {
    const gs = rows_('GroupMembers').filter(function (m) { return m.studentId === c.id; }).map(function (m) { return groups[m.groupId]; })
      .filter(function (g) { return g; })
      .map(function (g) { return { name: g.name, dayOfWeek: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime, court: nm_(courts[g.courtId]), coach: nm_(users[g.coachId]) }; });
    const att = rows_('Attendance').filter(function (x) { return x.studentId === c.id && lessons[x.lessonId]; })
      .map(function (x) { return { date: lessons[x.lessonId].date, status: x.status }; })
      .sort(function (x, y) { return x.date < y.date ? 1 : -1; }).slice(0, 10)
      .map(function (x) { x.dateLabel = dateLabel_(x.date); return x; });
    const pays = rows_('Payments').filter(function (p) { return p.studentId === c.id; })
      .sort(function (x, y) { return x.period < y.period ? 1 : -1; }).slice(0, 6)
      .map(function (p) { return { periodLabel: periodLabel_(p.period), amount: p.amount, status: paymentStatus_(p) }; });
    const ev = rows_('Evaluations').filter(function (e) { return e.studentId === c.id; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; })[0];
    return { id: c.id, name: fullName_(c), birthDate: c.birthDate, level: c.level, groups: gs, attendance: att, payments: pays, lastTerm: ev ? ev.term : null };
  });
  const kidIds = kids.map(function (k) { return k.id; });
  const st = byId_('Students');
  const res = rows_('Reservations').filter(function (r) { return r.date >= today && r.status !== 'IPTAL' && (r.userId === u.id || kidIds.indexOf(r.studentId) >= 0); })
    .sort(function (x, y) { return (x.date + x.startTime) < (y.date + y.startTime) ? -1 : 1; })
    .map(function (r) { return { id: r.id, dateLabel: dateLabel_(r.date), start: r.startTime, end: r.endTime, type: r.type, status: r.status, court: nm_(courts[r.courtId]), coach: nm_(users[r.coachId]), student: fullName_(st[r.studentId]), mine: r.userId === u.id }; });
  return { role: 'PARENT', today: today, todayLabel: dateLabel_(today), children: children, reservations: res };
}

/** Bekleyen WhatsApp hatırlatma sayıları (genel bakış bandı) */
function pendingCounts_() {
  const st = settings_();
  const w = function (l) { return l.filter(function (c) { return !c.skipReason && !c.sentAt; }).length; };
  return { dues: w(overdueDues_(st)) + w(upcomingDues_(st)), lessons: w(lessonReminders_(addDays_(today_(), 1), st)) };
}

// ------------------------------------------------------------------ Öğrenciler
function studentsList_(a) {
  const q = str_(a.q).toLocaleLowerCase('tr'), level = str_(a.level), status = str_(a.status) || 'aktif';
  const users = byId_('Users'), groups = byId_('Groups'), members = rows_('GroupMembers');
  const list = rows_('Students').filter(function (s) {
    if (status === 'aktif' && !s.active) return false;
    if (status === 'pasif' && s.active) return false;
    if (level && s.level !== level) return false;
    if (q) {
      const p = users[s.parentId];
      const hay = (fullName_(s) + ' ' + (p ? p.name : '')).toLocaleLowerCase('tr');
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
  return sortStudents_(list).map(function (s) {
    const p = users[s.parentId];
    return {
      id: s.id, name: fullName_(s), birthDate: s.birthDate, level: s.level, active: s.active, monthlyFee: s.monthlyFee,
      parent: p ? p.name : null, parentPhone: p ? p.phone : null,
      groups: members.filter(function (m) { return m.studentId === s.id && groups[m.groupId]; }).map(function (m) { return groups[m.groupId].name; }),
    };
  });
}

function studentGet_(a) {
  const s = byId_('Students')[a.id];
  if (!s) fail_('Öğrenci bulunamadı.');
  const users = byId_('Users'), groups = byId_('Groups'), lessons = byId_('Lessons');
  const p = users[s.parentId];
  const gs = rows_('GroupMembers').filter(function (m) { return m.studentId === s.id && groups[m.groupId]; }).map(function (m) {
    const g = groups[m.groupId];
    return { id: g.id, name: g.name, dayOfWeek: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime, coach: nm_(users[g.coachId]) };
  });
  const att = rows_('Attendance').filter(function (x) { return x.studentId === s.id && lessons[x.lessonId]; })
    .map(function (x) { const l = lessons[x.lessonId]; return { date: l.date, dateLabel: dateLabel_(l.date), group: nm_(groups[l.groupId]), status: x.status }; })
    .sort(function (x, y) { return x.date < y.date ? 1 : -1; }).slice(0, 30);
  const pays = rows_('Payments').filter(function (x) { return x.studentId === s.id; }).sort(function (x, y) { return x.period < y.period ? 1 : -1; })
    .map(function (x) { return { periodLabel: periodLabel_(x.period), amount: x.amount, paidAmount: x.paidAmount, paidAt: x.paidAt, paidAtLabel: x.paidAt ? dateLabel_(x.paidAt, false) : null, method: x.method, status: paymentStatus_(x) }; });
  const clean = Object.assign({}, s); delete clean._row;
  return { student: clean, parent: p ? { name: p.name, phone: p.phone } : null, parents: parentsList_(), groups: gs, attendance: att, payments: pays };
}

function studentSave_(a) {
  const level = LEVELS.indexOf(str_(a.level)) >= 0 ? str_(a.level) : 'BASLANGIC';
  const bd = opt_(a.birthDate);
  const data = {
    firstName: str_(a.firstName), lastName: str_(a.lastName), birthDate: bd && isDate_(bd) ? bd : null, phone: opt_(a.phone),
    level: level, monthlyFee: Math.max(0, int_(a.monthlyFee)), notes: opt_(a.notes), parentId: opt_(a.parentId),
  };
  if (!data.firstName || !data.lastName) fail_('Ad ve soyad zorunlu.');
  if (a.id) {
    const s = byId_('Students')[a.id];
    if (!s) fail_('Öğrenci bulunamadı.');
    data.active = a.active === true || a.active === 'on';
    update_('Students', s, data);
    return { id: s.id, message: 'Kaydedildi.' };
  }
  const id = newId_();
  insert_('Students', Object.assign({ id: id, active: true, createdAt: nowIso_() }, data));
  return { id: id };
}

// ------------------------------------------------------------------ Kullanıcılar
function usersList_(a) {
  const role = str_(a.role);
  const kids = rows_('Students');
  const order = { ADMIN: 0, COACH: 1, PARENT: 2 };
  return rows_('Users').filter(function (u) { return !role || u.role === role; })
    .sort(function (x, y) { return order[x.role] - order[y.role] || x.name.localeCompare(y.name, 'tr'); })
    .map(function (u) {
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active,
        children: kids.filter(function (s) { return s.parentId === u.id; }).map(fullName_),
        groupCount: rows_('Groups').filter(function (g) { return g.coachId === u.id; }).length,
      };
    });
}

function userGet_(a) {
  const u = byId_('Users')[a.id];
  if (!u) fail_('Kullanıcı bulunamadı.');
  return {
    user: { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, hourlyRate: u.hourlyRate, notifyConsent: u.notifyConsent },
    children: rows_('Students').filter(function (s) { return s.parentId === u.id; }).map(function (s) { return { id: s.id, name: fullName_(s) }; }),
    groups: rows_('Groups').filter(function (g) { return g.coachId === u.id && g.active; }).map(function (g) { return { id: g.id, name: g.name, dayOfWeek: g.dayOfWeek, startTime: g.startTime }; }),
  };
}

function userSave_(a, me) {
  const name = str_(a.name), email = str_(a.email).toLowerCase(), role = str_(a.role), pw = str_(a.password);
  if (!name || !email) fail_('Ad ve e-posta zorunlu.');
  if (['ADMIN', 'COACH', 'PARENT'].indexOf(role) < 0) fail_('Geçersiz rol.');
  const extra = { phone: opt_(a.phone), hourlyRate: Math.max(0, int_(a.hourlyRate)), notifyConsent: a.notifyConsent === true || a.notifyConsent === 'on' };
  const clash = rows_('Users').filter(function (u) { return u.email === email; })[0];
  if (!a.id) {
    if (pw.length < 8) fail_('Şifre en az 8 karakter olmalı.');
    if (clash) fail_('Bu e-posta zaten kayıtlı.');
    const id = newId_();
    insert_('Users', Object.assign({ id: id, name: name, email: email, role: role, passwordHash: hashPassword_(pw), active: true, createdAt: nowIso_() }, extra));
    return { id: id };
  }
  const u = byId_('Users')[a.id];
  if (!u) fail_('Kullanıcı bulunamadı.');
  const active = a.active === true || a.active === 'on';
  if (u.id === me.id && (role === 'PARENT' || !active)) fail_('Kendi yönetim yetkinizi kaldıramaz veya hesabınızı pasif yapamazsınız.');
  if (clash && clash.id !== u.id) fail_('Bu e-posta başka bir kullanıcıda kayıtlı.');
  if (pw && pw.length < 8) fail_('Yeni şifre en az 8 karakter olmalı.');
  const patch = Object.assign({ name: name, email: email, role: role, active: active }, extra);
  if (pw) patch.passwordHash = hashPassword_(pw);
  update_('Users', u, patch);
  // Yönetici hesabı kaydedince kullanıcının giriş kilidi (varsa) kalkar
  remove_('LoginAttempts', function (x) { return x.email === email; });
  if (!active) remove_('Sessions', function (s) { return s.userId === u.id; });
  return { message: 'Kaydedildi.' };
}

// ------------------------------------------------------------------ Gruplar
function groupsList_() {
  const users = byId_('Users'), courts = byId_('Courts');
  return rows_('Groups').slice().sort(function (x, y) {
    return (y.active - x.active) || x.dayOfWeek - y.dayOfWeek || (x.startTime < y.startTime ? -1 : 1);
  }).map(function (g) {
    return { id: g.id, name: g.name, level: g.level, dayOfWeek: g.dayOfWeek, startTime: g.startTime, endTime: g.endTime, capacity: g.capacity, active: g.active,
      coach: nm_(users[g.coachId]), court: nm_(courts[g.courtId]), count: activeMembers_(g.id).length };
  });
}

function groupForm_() {
  return { coaches: coachesList_(), courts: rows_('Courts').filter(function (c) { return c.active; }).map(function (c) { return { id: c.id, name: c.name }; }) };
}

function groupGet_(a) {
  const g = byId_('Groups')[a.id];
  if (!g) fail_('Grup bulunamadı.');
  const st = byId_('Students');
  const memberIds = rows_('GroupMembers').filter(function (m) { return m.groupId === g.id; }).map(function (m) { return m.studentId; });
  const members = sortStudents_(memberIds.map(function (id) { return st[id]; }).filter(function (s) { return s; }))
    .map(function (s) { return { id: s.id, name: fullName_(s), birthDate: s.birthDate, level: s.level, active: s.active }; });
  const candidates = rows_('Students').filter(function (s) { return s.active && memberIds.indexOf(s.id) < 0; })
    .map(function (s) { return { id: s.id, name: fullName_(s), level: s.level }; })
    .sort(function (x, y) { return (y.level === g.level) - (x.level === g.level) || x.name.localeCompare(y.name, 'tr'); });
  const att = rows_('Attendance');
  const lessons = rows_('Lessons').filter(function (l) { return l.groupId === g.id; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; }).slice(0, 8)
    .map(function (l) {
      const rows = att.filter(function (x) { return x.lessonId === l.id; });
      return { date: l.date, dateLabel: dateLabel_(l.date), present: rows.filter(function (x) { return x.status === 'GELDI'; }).length, total: rows.length };
    });
  const clean = Object.assign({}, g); delete clean._row;
  return Object.assign({ group: clean, members: members, activeCount: members.filter(function (m) { return m.active; }).length, candidates: candidates, lessons: lessons }, groupForm_());
}

function readGroup_(a, ignoreId) {
  const level = LEVELS.indexOf(str_(a.level)) >= 0 ? str_(a.level) : 'BASLANGIC';
  const d = {
    name: str_(a.name), level: level, dayOfWeek: int_(a.dayOfWeek), startTime: str_(a.startTime), endTime: str_(a.endTime),
    capacity: Math.max(1, int_(a.capacity, 6)), coachId: opt_(a.coachId), courtId: opt_(a.courtId),
  };
  if (!d.name) fail_('Grup adı zorunlu.');
  if (d.dayOfWeek < 1 || d.dayOfWeek > 7) fail_('Gün seçin.');
  if (!isTime_(d.startTime) || !isTime_(d.endTime) || d.startTime >= d.endTime) fail_('Başlangıç saati bitişten önce olmalı.');
  rows_('Groups').filter(function (g) { return g.active && g.dayOfWeek === d.dayOfWeek && g.id !== ignoreId; }).forEach(function (g) {
    if (!overlaps_(g.startTime, g.endTime, d.startTime, d.endTime)) return;
    if (d.courtId && g.courtId === d.courtId) fail_('Kort bu saatte "' + g.name + '" grubunda dolu.');
    if (d.coachId && g.coachId === d.coachId) fail_('Antrenör bu saatte "' + g.name + '" grubunda.');
  });
  return d;
}

function groupSave_(a) {
  if (!a.id) {
    const d = readGroup_(a);
    const id = newId_();
    insert_('Groups', Object.assign({ id: id, active: true }, d));
    return { id: id };
  }
  const g = byId_('Groups')[a.id];
  if (!g) fail_('Grup bulunamadı.');
  const d = readGroup_(a, g.id);
  // Kontenjan, gruptaki aktif öğrenci sayısının altına indirilemez
  const n = activeMembers_(g.id).length;
  if (d.capacity < n) fail_('Grupta ' + n + ' aktif öğrenci var; kontenjan en az ' + n + ' olmalı. Önce öğrenci çıkarın.');
  d.active = a.active === true || a.active === 'on';
  update_('Groups', g, d);
  return { message: 'Kaydedildi.' };
}

function groupAddMember_(a) {
  if (!a.studentId) fail_('Öğrenci seçin.');
  const g = byId_('Groups')[a.groupId];
  if (!g) fail_('Grup bulunamadı.');
  if (activeMembers_(g.id).length >= g.capacity) fail_('Grup kontenjanı (' + g.capacity + ') dolu.');
  const exists = rows_('GroupMembers').some(function (m) { return m.groupId === g.id && m.studentId === a.studentId; });
  if (!exists) insert_('GroupMembers', { groupId: g.id, studentId: a.studentId });
  return { message: 'Öğrenci eklendi.' };
}

function groupRemoveMember_(a) {
  remove_('GroupMembers', function (m) { return m.groupId === a.groupId && m.studentId === a.studentId; });
  return { message: 'Öğrenci gruptan çıkarıldı.' };
}

// ------------------------------------------------------------------ Program ve yoklama
function scheduleWeek_(a, u) {
  const today = today_();
  const week = weekStart_(isDate_(a.week) ? a.week : today);
  const days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays_(week, i); });
  let opt = {};
  const onlyMine = u.role === 'COACH' && a.mine === true;
  if (onlyMine) opt = { coachId: u.id };
  if (u.role === 'PARENT') opt = { studentIds: rows_('Students').filter(function (s) { return s.parentId === u.id; }).map(function (s) { return s.id; }) };
  const by = rangeSchedule_(days, opt);
  return {
    week: week, today: today, onlyMine: onlyMine, label: dateLabel_(week, false) + ' – ' + dateLabel_(days[6], false),
    prev: addDays_(week, -7), next: addDays_(week, 7), thisWeek: weekStart_(today),
    days: days.map(function (d) { return { date: d, label: dateLabel_(d, false), items: by[d] }; }),
  };
}

function attendanceDay_(a, u) {
  const today = today_();
  const date = isDate_(a.date) ? a.date : today;
  const items = rangeSchedule_([date], {})[date].filter(function (i) { return i.kind === 'GROUP'; });
  return { date: date, dateLabel: dateLabel_(date), today: today, prev: addDays_(date, -1), next: addDays_(date, 1), items: items };
}

function attendanceGet_(a, u) {
  const g = byId_('Groups')[a.groupId];
  if (!g) fail_('Grup bulunamadı.');
  const today = today_();
  let req = isDate_(a.date) ? a.date : today;
  if (req > today) req = today;
  let date = req;
  while (dow_(date) !== g.dayOfWeek) date = addDays_(date, -1);
  const lesson = rows_('Lessons').filter(function (l) { return l.groupId === g.id && l.date === date; })[0];
  const prev = {};
  if (lesson) rows_('Attendance').filter(function (x) { return x.lessonId === lesson.id; }).forEach(function (x) { prev[x.studentId] = x.status; });
  const users = byId_('Users'), courts = byId_('Courts');
  const members = sortStudents_(activeMembers_(g.id).map(function (m) { return byId_('Students')[m.studentId]; }))
    .map(function (s) { return { id: s.id, name: fullName_(s), status: prev[s.id] || 'GELDI' }; });
  return {
    group: { id: g.id, name: g.name, startTime: g.startTime, endTime: g.endTime, dayOfWeek: g.dayOfWeek, court: nm_(courts[g.courtId]), coach: nm_(users[g.coachId]) },
    date: date, dateLabel: dateLabel_(date), requested: isDate_(a.date) ? a.date : today, prevDate: addDays_(date, -7),
    nextDate: addDays_(date, 7) <= today ? addDays_(date, 7) : null, taken: !!lesson, takenBy: lesson ? nm_(users[lesson.takenById]) : null,
    note: lesson ? lesson.note : '', members: members,
  };
}

function attendanceSave_(a, u) {
  const date = str_(a.date);
  if (!isDate_(date)) fail_('Geçersiz tarih.');
  if (date > today_()) fail_('Gelecek tarihli derse yoklama alınamaz.');
  const g = byId_('Groups')[a.groupId];
  if (!g) fail_('Grup bulunamadı.');
  if (dow_(date) !== g.dayOfWeek) fail_('Bu grubun o gün dersi yok.');
  const st = a.statuses || {};
  const entries = activeMembers_(g.id).map(function (m) {
    const s = st[m.studentId];
    return { studentId: m.studentId, status: ['GELDI', 'GELMEDI', 'IZINLI'].indexOf(s) >= 0 ? s : 'GELMEDI' };
  });
  let lesson = rows_('Lessons').filter(function (l) { return l.groupId === g.id && l.date === date; })[0];
  if (lesson) lesson = update_('Lessons', lesson, { note: opt_(a.note), takenById: u.id });
  else lesson = insert_('Lessons', { id: newId_(), date: date, note: opt_(a.note), createdAt: nowIso_(), groupId: g.id, takenById: u.id, coachId: g.coachId, minutes: minutes_(g.startTime, g.endTime) });
  const ids = entries.map(function (e) { return e.studentId; });
  remove_('Attendance', function (x) { return x.lessonId === lesson.id && ids.indexOf(x.studentId) >= 0; });
  insertMany_('Attendance', entries.map(function (e) { return { lessonId: lesson.id, studentId: e.studentId, status: e.status }; }));
  return { message: 'Yoklama kaydedildi.' };
}

// ------------------------------------------------------------------ Kortlar ve rezervasyon
function courtsDay_(a, u) {
  const today = today_();
  const date = isDate_(a.date) ? a.date : today;
  const users = byId_('Users'), st = byId_('Students');
  const isParent = u.role === 'PARENT';
  const courts = rows_('Courts').filter(function (c) { return c.active; }).sort(function (x, y) { return x.name.localeCompare(y.name, 'tr'); });
  const groups = rows_('Groups').filter(function (g) { return g.active && g.dayOfWeek === dow_(date) && g.courtId; })
    .map(function (g) { return { courtId: g.courtId, start: g.startTime, end: g.endTime, name: isParent ? 'Grup dersi' : g.name }; });
  const res = rows_('Reservations').filter(function (r) { return r.date === date && r.status !== 'IPTAL'; })
    .sort(function (x, y) { return x.startTime < y.startTime ? -1 : 1; })
    .map(function (r) {
      const own = r.userId === u.id;
      const base = { courtId: r.courtId, start: r.startTime, end: r.endTime, status: r.status, type: r.type };
      // Veli başkalarının rezervasyon ayrıntısını göremez
      if (isParent && !own) return Object.assign(base, { hidden: true });
      return Object.assign(base, {
        id: r.id, user: nm_(users[r.userId]), coach: nm_(users[r.coachId]), student: fullName_(st[r.studentId]), note: r.note,
        canCancel: adm_(u) || own || r.coachId === u.id,
      });
    });
  let kids = [];
  if (isParent) kids = sortStudents_(rows_('Students').filter(function (s) { return s.parentId === u.id && s.active; }));
  else if (adm_(u)) kids = sortStudents_(rows_('Students').filter(function (s) { return s.active; }));
  return {
    date: date, dateLabel: dateLabel_(date), prev: addDays_(date, -1), next: addDays_(date, 1),
    courts: courts.map(function (c) { return { id: c.id, name: c.name, surface: c.surface, indoor: c.indoor }; }),
    allCourts: adm_(u) ? rows_('Courts').map(function (c) { return { id: c.id, name: c.name, surface: c.surface, indoor: c.indoor, active: c.active }; }) : [],
    groups: groups, reservations: res, coaches: coachesList_(),
    kids: kids.map(function (s) { return { id: s.id, name: fullName_(s) }; }), openFrom: OPEN_FROM, openUntil: OPEN_UNTIL,
  };
}

function courtConflict_(courtId, date, start, end) {
  const r = rows_('Reservations').filter(function (x) { return x.courtId === courtId && x.date === date && x.status !== 'IPTAL'; });
  if (r.some(function (x) { return overlaps_(x.startTime, x.endTime, start, end); })) return 'Kort bu saatte dolu (rezervasyon var).';
  const g = rows_('Groups').filter(function (x) { return x.courtId === courtId && x.active && x.dayOfWeek === dow_(date) && overlaps_(x.startTime, x.endTime, start, end); })[0];
  if (g) return 'Kort bu saatte "' + g.name + '" grup dersine ayrılmış.';
  return null;
}

function reservationCreate_(a, u) {
  const date = str_(a.date), start = str_(a.startTime), end = str_(a.endTime);
  let type = str_(a.type) === 'OZEL_DERS' ? 'OZEL_DERS' : 'KIRALAMA';
  let coachId = opt_(a.coachId);
  const studentId = opt_(a.studentId);
  if (!isDate_(date)) fail_('Geçersiz tarih.');
  if (!isTime_(start) || !isTime_(end) || start >= end) fail_('Başlangıç saati bitişten önce olmalı.');
  if (start < OPEN_FROM || end > OPEN_UNTIL) fail_('Kortlar ' + OPEN_FROM + '–' + OPEN_UNTIL + ' arası açık.');
  const today = today_();
  if (date < today || (date === today && start < nowTime_())) fail_('Geçmiş saate rezervasyon yapılamaz.');
  const court = byId_('Courts')[a.courtId];
  if (!court || !court.active) fail_('Kort seçin.');
  if (u.role === 'COACH' && type === 'OZEL_DERS' && !coachId) coachId = u.id;
  if (type === 'OZEL_DERS' && !coachId && u.role !== 'PARENT') fail_('Özel ders için antrenör seçin.');
  if (u.role === 'PARENT' && studentId) {
    const s = byId_('Students')[studentId];
    if (!s || s.parentId !== u.id) fail_('Öğrenci size bağlı değil.');
  }
  if (coachId) {
    const c = byId_('Users')[coachId];
    if (!c || c.role !== 'COACH' || !c.active) fail_('Antrenör bulunamadı.');
    const busy = rows_('Reservations').some(function (r) { return r.coachId === coachId && r.date === date && r.status !== 'IPTAL' && overlaps_(r.startTime, r.endTime, start, end); })
      || rows_('Groups').some(function (g) { return g.coachId === coachId && g.active && g.dayOfWeek === dow_(date) && overlaps_(g.startTime, g.endTime, start, end); });
    if (busy) fail_('Antrenör bu saatte başka bir derste.');
  }
  const conflict = courtConflict_(court.id, date, start, end);
  if (conflict) fail_(conflict);
  insert_('Reservations', {
    id: newId_(), date: date, startTime: start, endTime: end, type: type, status: u.role === 'PARENT' ? 'BEKLEMEDE' : 'ONAYLI',
    note: opt_(a.note), createdAt: nowIso_(), courtId: court.id, userId: u.id, coachId: type === 'OZEL_DERS' ? coachId : null, studentId: studentId,
  });
  return { message: u.role === 'PARENT' ? 'Talebiniz alındı, onaylanınca kesinleşecek.' : 'Rezervasyon oluşturuldu.' };
}

function reservationCancel_(a, u) {
  const r = byId_('Reservations')[a.id];
  if (!r) fail_('Rezervasyon bulunamadı.');
  if (!adm_(u) && r.userId !== u.id && r.coachId !== u.id) fail_('Bu rezervasyonu iptal etme yetkiniz yok.');
  update_('Reservations', r, { status: 'IPTAL' });
  return { message: 'Rezervasyon iptal edildi.' };
}

function reservationApprove_(a) {
  const r = byId_('Reservations')[a.id];
  if (!r || r.status !== 'BEKLEMEDE') fail_('Onay bekleyen rezervasyon bulunamadı.');
  update_('Reservations', r, { status: 'ONAYLI' });
  return { message: 'Onaylandı.' };
}

function courtCreate_(a) {
  const name = str_(a.name);
  if (!name) fail_('Kort adı zorunlu.');
  const surface = ['TOPRAK', 'SERT', 'CIM'].indexOf(str_(a.surface)) >= 0 ? str_(a.surface) : 'TOPRAK';
  insert_('Courts', { id: newId_(), name: name, surface: surface, indoor: a.indoor === true || a.indoor === 'on', active: true });
  return { message: 'Kort eklendi.' };
}

function courtToggle_(a) {
  const c = byId_('Courts')[a.id];
  if (!c) fail_('Kort bulunamadı.');
  update_('Courts', c, { active: !c.active });
  return { message: c.active ? 'Kort kapatıldı.' : 'Kort açıldı.' };
}

// ------------------------------------------------------------------ Aidatlar
function paymentsList_(a) {
  const today = today_();
  const overdueMode = a.status === 'GECIKTI';
  const period = isPeriod_(a.period) ? a.period : period_();
  const st = byId_('Students'), users = byId_('Users');
  const all = rows_('Payments').filter(function (p) { return overdueMode ? p.dueDate < today : p.period === period; });
  const rows = all.map(function (p) {
    const s = st[p.studentId] || {}, par = users[s.parentId];
    return {
      id: p.id, studentId: p.studentId, student: fullName_(s), parent: par ? par.name : null, parentPhone: par ? par.phone : null, studentPhone: s.phone,
      period: p.period, periodLabel: periodLabel_(p.period), dueLabel: dateLabel_(p.dueDate, false), amount: p.amount, paidAmount: p.paidAmount,
      paidAtLabel: p.paidAt ? dateLabel_(p.paidAt, false) : null, method: p.method, status: paymentStatus_(p),
    };
  }).filter(function (p) { return !a.status || p.status === a.status; })
    .sort(function (x, y) { return x.period < y.period ? 1 : x.period > y.period ? -1 : x.student.localeCompare(y.student, 'tr'); });
  const late = all.filter(function (p) { return paymentStatus_(p) === 'GECIKTI'; });
  return {
    period: period, periodLabel: periodLabel_(period), prev: addMonths_(period, -1), next: addMonths_(period, 1),
    prevLabel: periodLabel_(addMonths_(period, -1)), nextLabel: periodLabel_(addMonths_(period, 1)), overdueMode: overdueMode, status: a.status || '',
    expected: all.reduce(function (s, p) { return s + p.amount; }, 0), collected: all.reduce(function (s, p) { return s + p.paidAmount; }, 0),
    lateCount: late.length, lateSum: late.reduce(function (s, p) { return s + p.amount - p.paidAmount; }, 0), total: all.length, rows: rows,
  };
}

function paymentsGenerate_(a) {
  const period = str_(a.period);
  if (!isPeriod_(period)) fail_('Geçersiz dönem.');
  const dueDay = Math.min(28, Math.max(1, int_(a.dueDay, 10)));
  const due = period + '-' + (dueDay < 10 ? '0' : '') + dueDay;
  const existing = {};
  rows_('Payments').forEach(function (p) { if (p.period === period) existing[p.studentId] = true; });
  const list = rows_('Students').filter(function (s) { return s.active && s.monthlyFee > 0 && !existing[s.id]; });
  insertMany_('Payments', list.map(function (s) { return { id: newId_(), period: period, amount: s.monthlyFee, dueDate: due, paidAmount: 0, createdAt: nowIso_(), studentId: s.id }; }));
  return { message: list.length ? list.length + ' öğrenci için aidat oluşturuldu.' : 'Tüm aktif öğrencilerin bu dönem aidatı zaten var.' };
}

function paymentRecord_(a) {
  const amount = int_(a.amount), method = str_(a.method), paidAt = str_(a.paidAt) || today_();
  if (amount <= 0) fail_('Tutar girin.');
  if (['NAKIT', 'KART', 'HAVALE'].indexOf(method) < 0) fail_('Ödeme yöntemi seçin.');
  if (!isDate_(paidAt)) fail_('Geçersiz tarih.');
  const p = byId_('Payments')[a.id];
  if (!p) fail_('Kayıt bulunamadı.');
  if (p.paidAmount + amount > p.amount) fail_('En fazla ' + (p.amount - p.paidAmount) + ' TL tahsil edilebilir.');
  update_('Payments', p, { paidAmount: p.paidAmount + amount, paidAt: paidAt, method: method });
  return { message: 'Ödeme kaydedildi.' };
}

function paymentReset_(a) {
  const p = byId_('Payments')[a.id];
  if (!p) fail_('Kayıt bulunamadı.');
  update_('Payments', p, { paidAmount: 0, paidAt: null, method: null });
  return { message: 'Tahsilat geri alındı.' };
}

function paymentRemove_(a) {
  const p = byId_('Payments')[a.id];
  if (!p) fail_('Kayıt bulunamadı.');
  if (p.paidAmount > 0) fail_('Tahsilatı olan kayıt silinemez; önce tahsilatı geri alın.');
  remove_('Payments', function (x) { return x.id === p.id; });
  return { message: 'Kayıt silindi.' };
}

// ------------------------------------------------------------------ WhatsApp hatırlatmaları
const DEFAULT_SETTINGS = {
  tpl_aidat: 'Sayın {veli}, {ogrenci} için {donem} aidatı {tutar}. Son ödeme tarihi: {sonOdeme}. {akademi}',
  tpl_gecikti: 'Sayın {veli}, {ogrenci} için {donem} aidatından {tutar} ödeme bekleniyor (son ödeme: {sonOdeme}). Ödediyseniz bu mesajı dikkate almayınız. {akademi}',
  tpl_ders: 'Sayın {veli}, {ogrenci} için ders hatırlatması: {tarih} saat {saat}, {kort}. ({ders}) {akademi}',
  tpl_karne: 'Sayın {veli}, {ogrenci} için {donem} gelişim karnesi hazırlandı. Veli panelinden inceleyebilirsiniz: {link}',
  academy_name: 'Kapaklı Tenis Akademi', academy_logo: '',
  auto_enabled: '0', auto_dues_days_before: '3', auto_overdue_repeat_days: '7', auto_lessons: '1',
};

function settings_() {
  const s = Object.assign({}, DEFAULT_SETTINGS);
  rows_('Settings').forEach(function (r) { if (r.key in s) s[r.key] = r.value; });
  return s;
}

function saveSettings_(values) {
  Object.keys(values).forEach(function (k) {
    const row = rows_('Settings').filter(function (r) { return r.key === k; })[0];
    if (row) update_('Settings', row, { value: values[k] }); else insert_('Settings', { key: k, value: values[k] });
  });
}

function render_(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }); }

function trMobile_(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.indexOf('0090') === 0) d = d.slice(4);
  else if (d.indexOf('90') === 0 && d.length === 12) d = d.slice(2);
  else if (d.indexOf('0') === 0 && d.length === 11) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}
function prettyPhone_(raw) { const n = trMobile_(raw); return n ? '0' + n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6, 8) + ' ' + n.slice(8) : (raw || ''); }
function waLink_(phone, text) { const n = trMobile_(phone); return n ? 'https://wa.me/90' + n + '?text=' + encodeURIComponent(text) : null; }

function candidate_(kind, key, label, s, tpl, vars) {
  const users = byId_('Users');
  const p = users[s.parentId];
  let r;
  if (p) r = { name: p.name, userId: p.id, phone: p.phone, skip: !p.active ? 'Veli hesabı pasif' : !p.notifyConsent ? 'Veli bildirim izni vermemiş' : null };
  else r = { name: fullName_(s), userId: null, phone: s.phone, skip: null };
  const body = render_(tpl, Object.assign({ veli: r.name, ogrenci: fullName_(s), akademi: settings_().academy_name }, vars));
  return {
    key: key, kind: kind, label: label, studentId: s.id, studentName: fullName_(s), recipientName: r.name, userId: r.userId,
    phone: r.phone, phonePretty: prettyPhone_(r.phone), body: body, waUrl: waLink_(r.phone, body),
    skipReason: r.skip || (!r.phone ? 'Telefon numarası yok' : !trMobile_(r.phone) ? 'Telefon numarası geçersiz' : null),
  };
}

function markSent_(list) {
  const sent = {};
  rows_('Notifications').forEach(function (n) { if (n.dedupeKey) sent[n.dedupeKey] = n.createdAt; });
  list.forEach(function (c) { c.sentAt = sent[c.key] || null; });
  return list;
}

function upcomingDues_(st, days) {
  const n = days === undefined || days === null ? Number(st.auto_dues_days_before) : days;
  const today = today_(), until = addDays_(today, n), students = byId_('Students');
  return markSent_(rows_('Payments').filter(function (p) {
    const s = students[p.studentId];
    return s && s.active && p.dueDate >= today && p.dueDate <= until && p.paidAmount < p.amount;
  }).sort(function (x, y) { return x.dueDate < y.dueDate ? -1 : 1; }).map(function (p) {
    return candidate_('AIDAT', 'aidat:' + p.id + ':yaklasan', periodLabel_(p.period) + ' aidatı · son ödeme ' + dateLabel_(p.dueDate, false), students[p.studentId], st.tpl_aidat,
      { donem: periodLabel_(p.period), tutar: tl_(p.amount - p.paidAmount), sonOdeme: dateLabel_(p.dueDate, false) });
  }));
}

function overdueDues_(st) {
  const repeat = Math.max(1, Number(st.auto_overdue_repeat_days) || 7);
  const today = today_(), students = byId_('Students');
  return markSent_(rows_('Payments').filter(function (p) {
    const s = students[p.studentId];
    return s && s.active && p.dueDate < today && p.paidAmount < p.amount;
  }).sort(function (x, y) { return x.dueDate < y.dueDate ? -1 : 1; }).map(function (p) {
    const late = Math.round((parseD_(today) - parseD_(p.dueDate)) / 86400000);
    const bucket = Math.floor((late - 1) / repeat);
    return candidate_('AIDAT', 'aidat:' + p.id + ':gecikti:' + bucket, periodLabel_(p.period) + ' aidatı · ' + late + ' gün gecikti', students[p.studentId], st.tpl_gecikti,
      { donem: periodLabel_(p.period), tutar: tl_(p.amount - p.paidAmount), sonOdeme: dateLabel_(p.dueDate, false) });
  }));
}

function lessonReminders_(date, st) {
  const users = byId_('Users'), courts = byId_('Courts'), students = byId_('Students');
  const list = [];
  rows_('Groups').filter(function (g) { return g.active && g.dayOfWeek === dow_(date); })
    .sort(function (x, y) { return x.startTime < y.startTime ? -1 : 1; }).forEach(function (g) {
      activeMembers_(g.id).forEach(function (m) {
        list.push(candidate_('DERS', 'ders:' + g.id + ':' + m.studentId + ':' + date, g.name + ' · ' + g.startTime + '–' + g.endTime, students[m.studentId], st.tpl_ders,
          { tarih: dateLabel_(date), saat: g.startTime, kort: nm_(courts[g.courtId]) || 'akademi', ders: g.name, antrenor: nm_(users[g.coachId]) || '' }));
      });
    });
  rows_('Reservations').filter(function (r) { return r.date === date && r.type === 'OZEL_DERS' && r.status === 'ONAYLI' && r.studentId && students[r.studentId]; })
    .forEach(function (r) {
      list.push(candidate_('DERS', 'ders:res:' + r.id, 'Özel ders · ' + r.startTime + '–' + r.endTime, students[r.studentId], st.tpl_ders,
        { tarih: dateLabel_(date), saat: r.startTime, kort: nm_(courts[r.courtId]) || '', ders: 'Özel ders', antrenor: nm_(users[r.coachId]) || '' }));
    });
  return markSent_(list);
}

function karneCandidate_(evalId) {
  const e = byId_('Evaluations')[evalId];
  if (!e) return null;
  const s = byId_('Students')[e.studentId];
  const url = PropertiesService.getScriptProperties().getProperty('APP_URL') || ScriptApp.getService().getUrl() || '';
  return markSent_([candidate_('KARNE', 'karne:' + e.id, e.term + ' gelişim karnesi', s, settings_().tpl_karne, { donem: e.term, link: url })])[0];
}

function whatsappApi_() {
  const p = PropertiesService.getScriptProperties();
  const ok = p.getProperty('WHATSAPP_TOKEN') && p.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  return ok ? 'WhatsApp Cloud API (şablon: ' + (p.getProperty('WHATSAPP_TEMPLATE') || 'kta_bilgilendirme') + ')' : null;
}

function remindersView_(a) {
  const st = settings_();
  const tab = a.tab || 'aidat';
  const out = { tab: tab, api: whatsappApi_(), settings: st };
  if (tab === 'aidat') {
    out.days = a.days === undefined || a.days === null || a.days === '' ? Number(st.auto_dues_days_before) : int_(a.days);
    out.overdue = overdueDues_(st);
    out.upcoming = upcomingDues_(st, out.days);
  } else if (tab === 'ders') {
    out.date = isDate_(a.date) ? a.date : addDays_(today_(), 1);
    out.dateLabel = dateLabel_(out.date);
    out.items = lessonReminders_(out.date, st);
  } else if (tab === 'gecmis') {
    const users = byId_('Users');
    out.history = rows_('Notifications').slice().sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; }).slice(0, 150).map(function (n) {
      return { createdAt: n.createdAt, user: nm_(users[n.userId]), phone: prettyPhone_(n.phone), kind: n.kind, body: n.body, status: n.status, error: n.error };
    });
  }
  return out;
}

/** Elle gönderimde bulunacak adayı sunucuda yeniden üretir (istemciye güvenilmez) */
function findCandidate_(a, u) {
  const st = settings_();
  if (a.source === 'karne') {
    const e = byId_('Evaluations')[a.id];
    if (!e) fail_('Karne bulunamadı.');
    return karneCandidate_(a.id);
  }
  if (!adm_(u)) fail_('Bu işlem için yetkiniz yok.');
  const list = a.source === 'gecikti' ? overdueDues_(st) : a.source === 'yaklasan' ? upcomingDues_(st, a.days === '' || a.days == null ? undefined : int_(a.days))
    : a.source === 'ders' && isDate_(a.date) ? lessonReminders_(a.date, st) : [];
  return list.filter(function (c) { return c.key === a.key; })[0];
}

/** "WhatsApp'ta gönder" düğmesi: gönderimi geçmişe "elle gönderildi" olarak kaydeder */
function remindersLog_(a, u) {
  const c = findCandidate_(a, u);
  if (!c || c.skipReason || !c.waUrl) fail_('Mesaj bulunamadı ya da alıcının geçerli bir telefonu yok.');
  insert_('Notifications', {
    id: newId_(), channel: 'WHATSAPP', kind: c.kind, phone: c.phone, body: c.body, status: 'ELLE', error: null,
    dedupeKey: c.sentAt ? null : c.key, createdAt: nowIso_(), userId: c.userId, studentId: c.studentId,
  });
  return { waUrl: c.waUrl };
}

/** WhatsApp Cloud API ayarlıysa seçilenleri otomatik gönderir */
function remindersSend_(a, u) {
  if (!whatsappApi_()) fail_('WhatsApp API ayarlı değil; elle gönderim düğmelerini kullanın.');
  const st = settings_();
  const keys = a.keys || [];
  const all = a.source === 'gecikti' ? overdueDues_(st) : a.source === 'yaklasan' ? upcomingDues_(st, int_(a.days, 3)) : lessonReminders_(a.date, st);
  const r = deliver_(all.filter(function (c) { return keys.indexOf(c.key) >= 0; }), false);
  return { message: r.sent + ' mesaj gönderildi' + (r.failed ? ', ' + r.failed + ' gönderilemedi: ' + r.errors.slice(0, 3).join(' · ') : '') + '.' };
}

function deliver_(list, onlyNew) {
  const p = PropertiesService.getScriptProperties();
  const r = { sent: 0, failed: 0, skipped: 0, errors: [] };
  list.forEach(function (c) {
    if (c.skipReason || (onlyNew && c.sentAt)) { r.skipped++; return; }
    let ok = false, err = null;
    try {
      const resp = UrlFetchApp.fetch('https://graph.facebook.com/v21.0/' + p.getProperty('WHATSAPP_PHONE_NUMBER_ID') + '/messages', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + p.getProperty('WHATSAPP_TOKEN') },
        payload: JSON.stringify({
          messaging_product: 'whatsapp', to: '90' + trMobile_(c.phone), type: 'template',
          template: { name: p.getProperty('WHATSAPP_TEMPLATE') || 'kta_bilgilendirme', language: { code: 'tr' }, components: [{ type: 'body', parameters: [{ type: 'text', text: c.body }] }] },
        }),
      });
      const data = JSON.parse(resp.getContentText() || '{}');
      ok = resp.getResponseCode() < 300 && data.messages && data.messages[0];
      if (!ok) err = 'WhatsApp hatası: ' + ((data.error && data.error.message) || resp.getResponseCode());
    } catch (e) { err = String(e.message || e); }
    insert_('Notifications', { id: newId_(), channel: 'WHATSAPP', kind: c.kind, phone: c.phone, body: c.body, status: ok ? 'GONDERILDI' : 'HATA', error: err,
      dedupeKey: ok && !c.sentAt ? c.key : null, createdAt: nowIso_(), userId: c.userId, studentId: c.studentId });
    if (ok) r.sent++; else { r.failed++; r.errors.push(c.recipientName + ': ' + err); }
  });
  return r;
}

/** Zamanlanmış görev (günde bir): WhatsApp API ayarlıysa hatırlatmaları otomatik gönderir */
function otomatikHatirlatmalar() {
  const st = settings_();
  if (st.auto_enabled !== '1' || !whatsappApi_()) return;
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    deliver_(upcomingDues_(st).concat(overdueDues_(st)), true);
    if (st.auto_lessons === '1') deliver_(lessonReminders_(addDays_(today_(), 1), st), true);
  } finally { lock.releaseLock(); }
}

/** Editörden bir kez çalıştırın: her gün 18:00'de otomatikHatirlatmalar çalışsın */
function zamanlanmisGoreviKur() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'otomatikHatirlatmalar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('otomatikHatirlatmalar').timeBased().everyDays(1).atHour(18).inTimezone(TZ).create();
}

function saveTemplates_(a) {
  const v = {};
  ['tpl_aidat', 'tpl_gecikti', 'tpl_ders', 'tpl_karne'].forEach(function (k) { v[k] = str_(a[k]) || DEFAULT_SETTINGS[k]; });
  saveSettings_(v);
  return { message: 'Şablonlar kaydedildi.' };
}

/** Akademi adı ve logosu (giriş ekranı, menü, sekme başlığı, WhatsApp mesajları) */
function brand_() {
  const st = settings_();
  return { name: st.academy_name || DEFAULT_SETTINGS.academy_name, logo: st.academy_logo || '' };
}

function saveBranding_(a) {
  const name = str_(a.name).replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60) fail_('Akademi adı 2–60 karakter olmalı.');
  const st = settings_();
  const v = { academy_name: name };
  if (a.resetLogo === true || a.resetLogo === 'on') v.academy_logo = '';
  else if (str_(a.logo)) {
    const logo = str_(a.logo);
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(logo)) fail_('Logo bir resim dosyası olmalı (PNG, JPG veya WEBP).');
    if (logo.length > 48000) fail_('Logo çok büyük. Daha küçük bir resim seçin.');
    v.academy_logo = logo;
  }
  // Kayıtlı mesaj şablonlarında eski ad geçiyorsa {akademi} ile değiştir; böylece yeni ad otomatik kullanılır
  const old = st.academy_name;
  if (old && old !== name) {
    ['tpl_aidat', 'tpl_gecikti', 'tpl_ders', 'tpl_karne'].forEach(function (k) {
      if (st[k] && st[k].indexOf(old) >= 0) v[k] = st[k].split(old).join('{akademi}');
    });
  }
  saveSettings_(v);
  return { message: 'Akademi bilgileri kaydedildi.', brand: brand_() };
}

function saveAutomation_(a) {
  const clamp = function (v, min, max, def) { const n = parseInt(v, 10); return String(isFinite(n) ? Math.min(max, Math.max(min, n)) : def); };
  saveSettings_({
    auto_enabled: a.auto_enabled === 'on' || a.auto_enabled === true ? '1' : '0',
    auto_lessons: a.auto_lessons === 'on' || a.auto_lessons === true ? '1' : '0',
    auto_dues_days_before: clamp(a.auto_dues_days_before, 0, 15, 3),
    auto_overdue_repeat_days: clamp(a.auto_overdue_repeat_days, 1, 30, 7),
  });
  return { message: 'Otomatik gönderim ayarları kaydedildi.' };
}

// ------------------------------------------------------------------ Gelişim karnesi
function canViewStudent_(u, studentId) {
  if (adm_(u)) return true;
  const s = byId_('Students')[studentId];
  if (!s) return false;
  if (u.role === 'PARENT') return s.parentId === u.id;
  const groups = byId_('Groups');
  return rows_('GroupMembers').some(function (m) { return m.studentId === studentId && groups[m.groupId] && groups[m.groupId].coachId === u.id; });
}

function avg_(scores) {
  const v = Object.keys(scores).map(function (k) { return scores[k]; });
  return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
}

function parseScores_(json) {
  try { const o = JSON.parse(json || '{}'); const out = {}; SKILLS.forEach(function (s) { if (typeof o[s[0]] === 'number') out[s[0]] = o[s[0]]; }); return out; } catch (e) { return {}; }
}

function karneList_(a, u) {
  const groups = byId_('Groups'), users = byId_('Users');
  const members = rows_('GroupMembers');
  let list = rows_('Students').filter(function (s) { return s.active; });

  const evs = rows_('Evaluations');
  return sortStudents_(list).map(function (s) {
    const e = evs.filter(function (x) { return x.studentId === s.id; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; })[0];
    return {
      id: s.id, name: fullName_(s), level: s.level,
      groups: members.filter(function (m) { return m.studentId === s.id && groups[m.groupId]; }).map(function (m) { return groups[m.groupId].name; }),
      last: e ? { term: e.term, dateLabel: dateLabel_(e.date, false), coach: nm_(users[e.coachId]), avg: avg_(parseScores_(e.scores)) } : null,
    };
  });
}

function karneGet_(a, u) {
  if (!canViewStudent_(u, a.studentId)) fail_('Bu öğrencinin karnesini görme yetkiniz yok.');
  const s = byId_('Students')[a.studentId];
  const users = byId_('Users');
  const evs = rows_('Evaluations').filter(function (e) { return e.studentId === s.id; })
    .sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : (x.createdAt < y.createdAt ? 1 : -1); })
    .map(function (e) {
      return { id: e.id, term: e.term, date: e.date, dateLabel: dateLabel_(e.date, false), scores: parseScores_(e.scores), avg: avg_(parseScores_(e.scores)),
        strengths: e.strengths, improve: e.improve, goals: e.goals, coachId: e.coachId, coach: nm_(users[e.coachId]) };
    });
  const attended = rows_('Attendance').filter(function (x) { return x.studentId === s.id && x.status === 'GELDI'; }).length;
  const editable = u.role !== 'PARENT';
  let idx = 0;
  evs.forEach(function (e, i) { if (e.id === a.id) idx = i; });
  return {
    student: { id: s.id, name: fullName_(s), birthDate: s.birthDate, level: s.level }, evaluations: evs, index: idx, attended: attended,
    editable: editable, canDelete: editable && evs[idx] ? (adm_(u) || evs[idx].coachId === u.id) : false,
    notice: editable && evs[idx] ? karneCandidate_(evs[idx].id) : null, api: !!whatsappApi_(),
  };
}

function karneForm_(a, u) {
  if (!canViewStudent_(u, a.studentId)) fail_('Bu öğrenci için karne yazma yetkiniz yok.');
  const s = byId_('Students')[a.studentId];
  const last = rows_('Evaluations').filter(function (e) { return e.studentId === s.id; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; })[0];
  const t = today_(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
  const term = m >= 9 ? y + ' Güz' : m === 1 ? (y - 1) + ' Güz' : m <= 6 ? y + ' Bahar' : y + ' Yaz';
  return { student: { id: s.id, name: fullName_(s) }, last: last ? { term: last.term, coachId: last.coachId, scores: parseScores_(last.scores) } : null, term: term, today: t, coaches: adm_(u) ? coachesList_() : [] };
}

function karneSave_(a, u) {
  if (!canViewStudent_(u, a.studentId)) fail_('Bu öğrenci için karne yazma yetkiniz yok.');
  const term = str_(a.term);
  if (!term) fail_('Dönem adı girin (ör. 2026 Güz).');
  const date = isDate_(a.date) ? a.date : today_();
  const scores = {};
  SKILLS.forEach(function (s) {
    const n = Number(a['skill_' + s[0]]);
    if (!(n >= 1 && n <= 5)) fail_('"' + s[1] + '" için puan seçin.');
    scores[s[0]] = n;
  });
  const id = newId_();
  insert_('Evaluations', { id: id, date: date, term: term, scores: JSON.stringify(scores), strengths: opt_(a.strengths), improve: opt_(a.improve), goals: opt_(a.goals),
    createdAt: nowIso_(), studentId: a.studentId, coachId: opt_(a.coachId) || (u.role === 'COACH' ? u.id : null) });
  return { id: id, studentId: a.studentId };
}

function karneRemove_(a, u) {
  const e = byId_('Evaluations')[a.id];
  if (!e) fail_('Karne bulunamadı.');
  remove_('Evaluations', function (x) { return x.id === e.id; });
  return { studentId: e.studentId, message: 'Karne silindi.' };
}

// ------------------------------------------------------------------ Ders saati raporu
function coachReport_(coachId, period) {
  const coach = byId_('Users')[coachId];
  if (!coach || coach.role !== 'COACH') return null;
  const range = monthRange_(period), from = range[0], to = range[1];
  const today = today_(), now = nowTime_();
  const isPast = function (d, end) { return d < today || (d === today && end <= now); };
  const groups = byId_('Groups'), students = byId_('Students');
  const att = rows_('Attendance');
  const rows = [];
  const done = {};
  rows_('Lessons').filter(function (l) {
    const g = groups[l.groupId];
    return l.date >= from && l.date <= to && g && (l.coachId === coachId || (!l.coachId && g.coachId === coachId));
  }).forEach(function (l) {
    const g = groups[l.groupId];
    done[l.groupId + ':' + l.date] = true;
    rows.push({ date: l.date, type: 'GRUP', title: g.name, start: g.startTime, end: g.endTime, minutes: l.minutes || minutes_(g.startTime, g.endTime),
      attendees: att.filter(function (x) { return x.lessonId === l.id && x.status === 'GELDI'; }).length, status: 'YAPILDI' });
  });
  const mine = rows_('Groups').filter(function (g) { return g.coachId === coachId && g.active; });
  for (let d = from; d <= to; d = addDays_(d, 1)) {
    mine.forEach(function (g) {
      if (g.dayOfWeek !== dow_(d) || done[g.id + ':' + d]) return;
      rows.push({ date: d, type: 'GRUP', title: g.name, start: g.startTime, end: g.endTime, minutes: minutes_(g.startTime, g.endTime), attendees: null,
        status: isPast(d, g.endTime) ? 'YOKLAMA_YOK' : 'PLANLI' });
    });
  }
  rows_('Reservations').filter(function (r) { return r.coachId === coachId && r.type === 'OZEL_DERS' && r.status === 'ONAYLI' && r.date >= from && r.date <= to; })
    .forEach(function (r) {
      const s = students[r.studentId];
      rows.push({ date: r.date, type: 'OZEL', title: 'Özel ders' + (s ? ' · ' + fullName_(s) : ''), start: r.startTime, end: r.endTime,
        minutes: minutes_(r.startTime, r.endTime), attendees: null, status: isPast(r.date, r.endTime) ? 'YAPILDI' : 'PLANLI' });
    });
  rows.sort(function (x, y) { return (x.date + x.start) < (y.date + y.start) ? -1 : 1; });
  rows.forEach(function (r) { r.dateLabel = dateLabel_(r.date); });
  const doneRows = rows.filter(function (r) { return r.status === 'YAPILDI'; });
  const gm = doneRows.filter(function (r) { return r.type === 'GRUP'; }).reduce(function (s, r) { return s + r.minutes; }, 0);
  const pm = doneRows.filter(function (r) { return r.type === 'OZEL'; }).reduce(function (s, r) { return s + r.minutes; }, 0);
  return {
    coach: { id: coach.id, name: coach.name, hourlyRate: coach.hourlyRate }, rows: rows, groupMinutes: gm, privateMinutes: pm, totalMinutes: gm + pm,
    lessonsDone: doneRows.length, missing: rows.filter(function (r) { return r.status === 'YOKLAMA_YOK'; }).length,
    upcoming: rows.filter(function (r) { return r.status === 'PLANLI'; }).length, earnings: Math.round((gm + pm) / 60 * coach.hourlyRate),
  };
}

function reportsList_(a, u) {
  const period = isPeriod_(a.period) ? a.period : period_();
  const ids = rows_('Users').filter(function (x) { return x.role === 'COACH'; }).sort(function (x, y) { return x.name.localeCompare(y.name, 'tr'); }).map(function (x) { return x.id; });
  return {
    period: period, periodLabel: periodLabel_(period), prev: addMonths_(period, -1), next: addMonths_(period, 1),
    prevLabel: periodLabel_(addMonths_(period, -1)), nextLabel: periodLabel_(addMonths_(period, 1)),
    reports: ids.map(function (id) { return coachReport_(id, period); }).filter(function (r) { return r; }),
  };
}

function reportsCoach_(a, u) {
  const coachId = a.coachId || (u.role === 'COACH' ? u.id : null);
  const period = isPeriod_(a.period) ? a.period : period_();
  const r = coachReport_(coachId, period);
  if (!r) fail_('Antrenör bulunamadı.');
  return { period: period, periodLabel: periodLabel_(period), prev: addMonths_(period, -1), next: addMonths_(period, 1), report: r };
}

/** Raporu bu E-Tablo içinde yeni bir sayfaya yazar (oradan Excel olarak indirilebilir) */
function reportsToSheet_(a, u) {
  const data = reportsList_(a, u);
  const name = 'Rapor ' + data.period;
  const bk = book_();
  let sh = bk.getSheetByName(name);
  if (sh) sh.clear(); else sh = bk.insertSheet(name);
  const statusLabel = { YAPILDI: 'Yapıldı', YOKLAMA_YOK: 'Yoklama alınmadı', PLANLI: 'Planlı' };
  const out = [['Antrenör', 'Tarih', 'Başlangıç', 'Bitiş', 'Ders', 'Tür', 'Süre (saat)', 'Gelen öğrenci', 'Durum']];
  data.reports.forEach(function (r) {
    r.rows.forEach(function (x) { out.push([r.coach.name, x.date, x.start, x.end, x.title, x.type === 'GRUP' ? 'Grup' : 'Özel', x.minutes / 60, x.attendees === null ? '' : x.attendees, statusLabel[x.status]]); });
  });
  out.push(['', '', '', '', '', '', '', '', '']);
  out.push(['ÖZET', '', '', '', '', '', 'Yapılan saat', 'Saatlik ücret', 'Hakediş (TL)']);
  data.reports.forEach(function (r) { out.push([r.coach.name, '', '', '', '', '', r.totalMinutes / 60, r.coach.hourlyRate, r.earnings]); });
  sh.getRange(1, 1, out.length, out[0].length).setValues(out);
  sh.getRange(1, 1, 1, out[0].length).setFontWeight('bold');
  return { url: bk.getUrl() + '#gid=' + sh.getSheetId(), message: '"' + name + '" sayfası oluşturuldu.' };
}

// ------------------------------------------------------------------ Örnek veriler (isteğe bağlı)
/**
 * Editörden çalıştırın: TÜM verileri silip örnek verilerle doldurur (deneme için).
 * Tüm örnek hesapların şifresi: tenis123  ·  Yönetici: yonetici@kapaklitenis.com
 * Gerçek kullanıma geçmeden önce "tumVerileriSil" ile temizleyin.
 */
function ornekVerileriYukle() {
  tumVerileriSil();
  const hash = hashPassword_('tenis123');
  const today = today_(), y = Number(today.slice(0, 4));
  const U = function (name, email, role, phone, extra) {
    return insert_('Users', Object.assign({ id: newId_(), name: name, email: email, role: role, phone: phone || null, passwordHash: hash, active: true, createdAt: nowIso_(), hourlyRate: 0, notifyConsent: true }, extra || {}));
  };
  U('Akademi Yöneticisi', 'yonetici@kapaklitenis.com', 'ADMIN', '0532 000 00 00');
  const ca = U('Emre Yıldız', 'emre@kapaklitenis.com', 'COACH', '0533 111 11 11', { hourlyRate: 750 });
  const cb = U('Selin Kaya', 'selin@kapaklitenis.com', 'COACH', '0533 222 22 22', { hourlyRate: 650 });
  const P = [
    U('Ayşe Demir', 'ayse@ornek.com', 'PARENT', '0535 100 10 01'), U('Mehmet Çelik', 'mehmet@ornek.com', 'PARENT', '0535 100 10 02'),
    U('Zeynep Arslan', 'zeynep@ornek.com', 'PARENT', '0535 100 10 03'), U('Murat Öztürk', 'murat@ornek.com', 'PARENT', '0535 100 10 04'),
    U('Elif Şahin', 'elif@ornek.com', 'PARENT', '0535 100 10 05', { notifyConsent: false }), U('Burak Aydın', 'burak@ornek.com', 'PARENT', null),
  ];
  const C = [
    { id: newId_(), name: 'Kort 1', surface: 'TOPRAK', indoor: false, active: true },
    { id: newId_(), name: 'Kort 2', surface: 'TOPRAK', indoor: false, active: true },
    { id: newId_(), name: 'Kort 3', surface: 'SERT', indoor: true, active: true },
  ];
  insertMany_('Courts', C);
  const S = [
    ['Deniz', 'Demir', 7, 'BASLANGIC', 2500, 0], ['Ece', 'Demir', 10, 'ORTA', 3000, 0], ['Kerem', 'Çelik', 8, 'BASLANGIC', 2500, 1],
    ['Ada', 'Arslan', 6, 'BASLANGIC', 2500, 2], ['Can', 'Arslan', 12, 'ILERI', 3500, 2], ['Defne', 'Öztürk', 9, 'ORTA', 3000, 3],
    ['Arda', 'Öztürk', 14, 'PERFORMANS', 4500, 3], ['Mira', 'Şahin', 11, 'ORTA', 3000, 4], ['Efe', 'Aydın', 13, 'ILERI', 3500, 5], ['Lina', 'Aydın', 7, 'BASLANGIC', 2500, 5],
  ].map(function (r) {
    return { id: newId_(), firstName: r[0], lastName: r[1], birthDate: (y - r[2]) + '-0' + ((r[2] % 9) + 1) + '-15', level: r[3], monthlyFee: r[4], active: true, createdAt: nowIso_(), parentId: P[r[5]].id };
  });
  insertMany_('Students', S);
  const G = [
    ['Minikler Salı', 'BASLANGIC', 2, '16:30', '17:30', cb, 0, [0, 2, 3, 9]], ['Minikler Perşembe', 'BASLANGIC', 4, '16:30', '17:30', cb, 0, [0, 2, 3, 9]],
    ['Orta Grup Pazartesi', 'ORTA', 1, '17:30', '19:00', ca, 1, [1, 5, 7]], ['Orta Grup Çarşamba', 'ORTA', 3, '17:30', '19:00', ca, 1, [1, 5, 7]],
    ['İleri Grup Cuma', 'ILERI', 5, '18:00', '19:30', ca, 2, [4, 8]], ['Performans Cumartesi', 'PERFORMANS', 6, '10:00', '12:00', ca, 2, [4, 6, 8]],
    ['Hafta Sonu Minikler', 'BASLANGIC', 7, '10:00', '11:00', cb, 0, [3, 9]],
  ].map(function (r) { return { g: { id: newId_(), name: r[0], level: r[1], dayOfWeek: r[2], startTime: r[3], endTime: r[4], capacity: 6, active: true, coachId: r[5].id, courtId: C[r[6]].id }, m: r[7] }; });
  insertMany_('Groups', G.map(function (x) { return x.g; }));
  const gm = [];
  G.forEach(function (x) { x.m.forEach(function (i) { gm.push({ groupId: x.g.id, studentId: S[i].id }); }); });
  insertMany_('GroupMembers', gm);
  // son 3 haftanın yoklamaları
  const statuses = ['GELDI', 'GELDI', 'GELDI', 'GELDI', 'GELMEDI', 'IZINLI'];
  const notes = ['Forehand tekniği', 'Servis çalışması', 'Ayak hareketleri', 'Maç oyunu'];
  let k = 0;
  const lessons = [], att = [];
  for (let back = 21; back >= 2; back--) {
    const d = addDays_(today, -back);
    G.forEach(function (x) {
      const g = x.g;
      if (g.dayOfWeek !== dow_(d)) return;
      const l = { id: newId_(), date: d, note: notes[k % 4], createdAt: nowIso_(), groupId: g.id, takenById: g.coachId, coachId: g.coachId, minutes: minutes_(g.startTime, g.endTime) };
      lessons.push(l);
      x.m.forEach(function (i) { att.push({ lessonId: l.id, studentId: S[i].id, status: statuses[k++ % statuses.length] }); });
    });
  }
  insertMany_('Lessons', lessons);
  insertMany_('Attendance', att);
  // aidatlar
  const cur = period_(), pays = [];
  [[-2, 1], [-1, 0.8], [0, 0.4]].forEach(function (o) {
    const per = addMonths_(cur, o[0]);
    S.forEach(function (s, i) {
      const paid = i / S.length < o[1];
      pays.push({ id: newId_(), period: per, amount: s.monthlyFee, dueDate: o[0] === 0 ? addDays_(today, 2) : per + '-10', paidAmount: paid ? s.monthlyFee : 0,
        paidAt: paid ? per + '-0' + ((i % 8) + 1) : null, method: paid ? ['NAKIT', 'KART', 'HAVALE'][i % 3] : null, createdAt: nowIso_(), studentId: s.id });
    });
  });
  insertMany_('Payments', pays);
  // rezervasyonlar
  const R = function (d, s, e, type, court, user, status, extra) {
    return Object.assign({ id: newId_(), date: d, startTime: s, endTime: e, type: type, status: status || 'ONAYLI', createdAt: nowIso_(), courtId: C[court].id, userId: user.id }, extra || {});
  };
  insertMany_('Reservations', [
    R(addDays_(today, 1), '09:00', '10:00', 'OZEL_DERS', 1, ca, 'ONAYLI', { coachId: ca.id, studentId: S[6].id }),
    R(addDays_(today, 1), '20:00', '21:30', 'KIRALAMA', 0, P[3], 'ONAYLI', { note: 'Aile maçı' }),
    R(addDays_(today, 2), '19:00', '20:00', 'OZEL_DERS', 2, P[0], 'BEKLEMEDE', { coachId: cb.id, studentId: S[1].id, note: 'Servis üzerine çalışmak istiyoruz' }),
    R(addDays_(today, 3), '08:00', '09:00', 'KIRALAMA', 1, P[5], 'BEKLEMEDE'),
    R(addDays_(today, -3), '09:00', '10:00', 'OZEL_DERS', 1, ca, 'ONAYLI', { coachId: ca.id, studentId: S[6].id }),
    R(addDays_(today, -5), '11:00', '12:30', 'OZEL_DERS', 2, ca, 'ONAYLI', { coachId: ca.id, studentId: S[4].id }),
    R(addDays_(today, -4), '15:00', '16:00', 'OZEL_DERS', 0, cb, 'ONAYLI', { coachId: cb.id, studentId: S[1].id }),
  ]);
  // karneler
  const sc = function (b) { const o = {}; SKILLS.forEach(function (s, i) { o[s[0]] = Math.min(5, Math.max(1, b[i])); }); return JSON.stringify(o); };
  const E = [
    [1, ca, [2, 2, 2, 1, 2, 3, 2, 4], [3, 3, 2, 2, 3, 3, 3, 4], "Forehand'de top kontrolü belirgin şekilde gelişti.", 'Servis atışında top atma tutarlılığı.', 'Servisi düzenli içeri sokmak.'],
    [4, ca, [3, 3, 3, 2, 3, 3, 3, 4], [4, 3, 4, 3, 4, 4, 3, 5], 'Servis hızı ve isabeti arttı.', 'Fileye çıkış zamanlaması.', 'Kulüp turnuvasında çeyrek final.'],
    [6, ca, [4, 3, 4, 3, 4, 4, 4, 4], [4, 4, 4, 4, 4, 5, 4, 5], 'Kondisyonu ve maç disiplini çok iyi, backhand artık güvenilir bir vuruş.', 'İkinci servis çeşitliliği (kick).', 'Bölge turnuvası; kick servis.'],
    [0, cb, [1, 1, 1, 1, 2, 2, 1, 3], [2, 1, 2, 1, 2, 3, 2, 3], 'Raketle topu karşılamada çok gelişti.', 'Dikkatini ders boyunca toplu tutmak.', 'Forehand ile 5 top karşılıklı vuruş.'],
  ];
  const evs = [];
  E.forEach(function (e) {
    evs.push({ id: newId_(), date: y + '-06-15', term: y + ' Bahar', scores: sc(e[2]), goals: 'Temel vuruşları oturtmak.', createdAt: nowIso_(), studentId: S[e[0]].id, coachId: e[1].id });
    evs.push({ id: newId_(), date: addDays_(today, -2), term: y + ' Güz', scores: sc(e[3]), strengths: e[4], improve: e[5], goals: e[6], createdAt: nowIso_(), studentId: S[e[0]].id, coachId: e[1].id });
  });
  insertMany_('Evaluations', evs);
  return 'Örnek veriler yüklendi. Tüm hesapların şifresi: tenis123';
}

/** Editörden çalıştırın: tüm verileri siler (tablolar boş kalır, sistem ilk kurulum ekranıyla açılır) */
function tumVerileriSil() {
  Object.keys(SCHEMA).forEach(function (name) {
    const sh = sheet_(name);
    const n = sh.getLastRow() - 1;
    if (n > 0) sh.deleteRows(2, n);
    delete _cache[name];
  });
  return 'Tüm veriler silindi.';
}
