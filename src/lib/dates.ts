// Tüm tarih hesapları Türkiye saatine göre (Europe/Istanbul, UTC+3, yaz saati yok)
const TZ = "Europe/Istanbul";

export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function nowTimeStr(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(),
  );
}

export function currentPeriod(): string {
  return todayStr().slice(0, 7);
}

function parse(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
}

/** 1=Pazartesi ... 7=Pazar */
export function dayOfWeek(d: string): number {
  const w = parse(d).getUTCDay();
  return w === 0 ? 7 : w;
}

export function startOfWeek(d: string): string {
  return addDays(d, 1 - dayOfWeek(d));
}

export function isValidDate(d: string | undefined | null): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(parse(d).getTime());
}

export function isValidPeriod(p: string | undefined | null): p is string {
  return !!p && /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export function isValidTime(t: string | undefined | null): t is string {
  return !!t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function periodLabel(p: string): string {
  const [y, m] = p.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function dateLabel(d: string, withDay = true): string {
  const [y, m, day] = d.split("-").map(Number);
  const base = `${day} ${MONTHS[m - 1]} ${y}`;
  if (!withDay) return base;
  const names = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  return `${base}, ${names[dayOfWeek(d)]}`;
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!isValidDate(birthDate)) return null;
  const today = todayStr();
  let age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  if (today.slice(5) < birthDate.slice(5)) age--;
  return age;
}

/** İki saat aralığı çakışıyor mu? ("SS:DD" metinleri sözlük sırasıyla karşılaştırılabilir) */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export function minutesBetween(start: string, end: string): number {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return Math.max(0, m(end) - m(start));
}

export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

/** Bir ayın ilk ve son günü */
export function monthRange(period: string): [string, string] {
  const first = `${period}-01`;
  return [first, addDays(`${addMonths(period, 1)}-01`, -1)];
}
