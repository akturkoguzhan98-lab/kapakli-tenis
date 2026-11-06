import "server-only";
import { chunk, db } from "../db";
import { addDays, dateLabel, dayOfWeek, periodLabel, todayStr } from "../dates";
import { fullName, tl } from "../format";
import { normalizeTrMobile, waLink } from "../phone";
import { sendMessage } from "./providers";
import { getSettings, render, Settings } from "./settings";

export type Kind = "AIDAT" | "DERS" | "KARNE" | "GENEL";

/** Gönderilmeye aday tek bir mesaj */
export type Candidate = {
  key: string; // tekrar gönderimi önleyen anahtar
  kind: Kind;
  label: string; // ekranda gösterilecek kısa açıklama
  studentId: string;
  studentName: string;
  recipientName: string;
  userId: string | null;
  phone: string | null;
  body: string;
  waUrl: string | null;
  skipReason?: string; // gönderilemiyorsa nedeni
  sentAt?: Date; // bu anahtarla daha önce gönderildiyse
};

type StudentWithParent = {
  id: string; firstName: string; lastName: string; phone: string | null;
  parent: { id: string; name: string; phone: string | null; notifyConsent: boolean; active: boolean } | null;
};

/** Mesajın kime gideceğini belirler: veli varsa veli, yoksa (yetişkin öğrenci) öğrencinin kendisi */
function recipient(s: StudentWithParent) {
  if (s.parent) {
    return {
      name: s.parent.name,
      userId: s.parent.id,
      phone: s.parent.phone,
      skip: !s.parent.active ? "Veli hesabı pasif" : !s.parent.notifyConsent ? "Veli bildirim izni vermemiş" : undefined,
    };
  }
  return { name: fullName(s), userId: null, phone: s.phone, skip: undefined };
}

function candidate(kind: Kind, key: string, label: string, s: StudentWithParent, tpl: string, vars: Record<string, string>): Candidate {
  const r = recipient(s);
  const body = render(tpl, { veli: r.name, ogrenci: fullName(s), ...vars });
  const valid = normalizeTrMobile(r.phone);
  return {
    key, kind, label,
    studentId: s.id,
    studentName: fullName(s),
    recipientName: r.name,
    userId: r.userId,
    phone: r.phone,
    body,
    waUrl: waLink(r.phone, body),
    skipReason: r.skip ?? (!r.phone ? "Telefon numarası yok" : !valid ? "Telefon numarası geçersiz" : undefined),
  };
}

async function markSent(list: Candidate[]) {
  if (!list.length) return list;
  const sent: { dedupeKey: string | null; createdAt: Date }[] = [];
  for (const keys of chunk(list.map((c) => c.key), 50)) {
    sent.push(...(await db.notification.findMany({ where: { dedupeKey: { in: keys } }, select: { dedupeKey: true, createdAt: true } })));
  }
  const map = new Map(sent.map((n) => [n.dedupeKey, n.createdAt]));
  return list.map((c) => ({ ...c, sentAt: map.get(c.key) }));
}

const parentInclude = { parent: true } as const;

/** Son ödeme tarihi önümüzdeki N gün içinde olan, ödenmemiş aidatlar */
export async function upcomingDues(settings?: Settings, days?: number) {
  const st = settings ?? (await getSettings());
  const n = days ?? Number(st.auto_dues_days_before);
  const today = todayStr();
  const payments = await db.payment.findMany({
    where: { dueDate: { gte: today, lte: addDays(today, n) }, student: { active: true } },
    include: { student: { include: parentInclude } },
    orderBy: { dueDate: "asc" },
  });
  return markSent(
    payments
      .filter((p) => p.paidAmount < p.amount)
      .map((p) =>
        candidate("AIDAT", `aidat:${p.id}:yaklasan`, `${periodLabel(p.period)} aidatı · son ödeme ${dateLabel(p.dueDate, false)}`, p.student, st.tpl_aidat, {
          donem: periodLabel(p.period),
          tutar: tl(p.amount - p.paidAmount),
          sonOdeme: dateLabel(p.dueDate, false),
        }),
      ),
  );
}

/** Son ödeme tarihi geçmiş aidatlar. Anahtar "tekrar aralığı"na göre değişir; böylece ör. haftada bir yeniden hatırlatılır. */
export async function overdueDues(settings?: Settings) {
  const st = settings ?? (await getSettings());
  const repeat = Math.max(1, Number(st.auto_overdue_repeat_days) || 7);
  const today = todayStr();
  const payments = await db.payment.findMany({
    where: { dueDate: { lt: today }, student: { active: true } },
    include: { student: { include: parentInclude } },
    orderBy: { dueDate: "asc" },
  });
  return markSent(
    payments
      .filter((p) => p.paidAmount < p.amount)
      .map((p) => {
        const daysLate = Math.round((Date.parse(today) - Date.parse(p.dueDate)) / 86400000);
        const bucket = Math.floor((daysLate - 1) / repeat);
        return candidate("AIDAT", `aidat:${p.id}:gecikti:${bucket}`, `${periodLabel(p.period)} aidatı · ${daysLate} gün gecikti`, p.student, st.tpl_gecikti, {
          donem: periodLabel(p.period),
          tutar: tl(p.amount - p.paidAmount),
          sonOdeme: dateLabel(p.dueDate, false),
        });
      }),
  );
}

/** Belirli bir günün grup dersleri ve onaylı özel dersleri için hatırlatmalar */
export async function lessonReminders(date: string, settings?: Settings) {
  const st = settings ?? (await getSettings());
  const groups = await db.group.findMany({
    where: { active: true, dayOfWeek: dayOfWeek(date) },
    include: { court: true, coach: true, members: { include: { student: { include: parentInclude } } } },
    orderBy: { startTime: "asc" },
  });
  const privates = await db.reservation.findMany({
    where: { date, type: "OZEL_DERS", status: "ONAYLI", studentId: { not: null } },
    include: { court: true, coach: true, student: { include: parentInclude } },
    orderBy: { startTime: "asc" },
  });
  const list: Candidate[] = [];
  for (const g of groups) {
    for (const m of g.members) {
      if (!m.student.active) continue;
      list.push(
        candidate("DERS", `ders:${g.id}:${m.studentId}:${date}`, `${g.name} · ${g.startTime}–${g.endTime}`, m.student, st.tpl_ders, {
          tarih: dateLabel(date), saat: g.startTime, kort: g.court?.name ?? "akademi", ders: g.name, antrenor: g.coach?.name ?? "",
        }),
      );
    }
  }
  for (const r of privates) {
    if (!r.student) continue;
    list.push(
      candidate("DERS", `ders:res:${r.id}`, `Özel ders · ${r.startTime}–${r.endTime}`, r.student, st.tpl_ders, {
        tarih: dateLabel(date), saat: r.startTime, kort: r.court.name, ders: "Özel ders", antrenor: r.coach?.name ?? "",
      }),
    );
  }
  return markSent(list);
}

export async function karneReminder(evaluationId: string, appUrl: string) {
  const st = await getSettings();
  const e = await db.evaluation.findUnique({ where: { id: evaluationId }, include: { student: { include: parentInclude } } });
  if (!e) return null;
  const [c] = await markSent([
    candidate("KARNE", `karne:${e.id}`, `${e.term} gelişim karnesi`, e.student, st.tpl_karne, {
      donem: e.term, link: `${appUrl}/karne/${e.studentId}`,
    }),
  ]);
  return c;
}

/**
 * Adayları gönderir ve geçmişe kaydeder.
 * - skipReason olanlar atlanır.
 * - onlyNew: daha önce aynı anahtarla gönderilmiş olanları atlar (otomatik gönderimde kullanılır).
 * Anahtar sadece başarılı gönderimde kaydedilir; hata alan mesaj bir sonraki çalışmada yeniden denenir.
 */
export async function deliver(list: Candidate[], opts: { onlyNew?: boolean } = {}) {
  const result = { sent: 0, test: 0, failed: 0, skipped: 0, errors: [] as string[] };
  for (const c of list) {
    if (c.skipReason || (opts.onlyNew && c.sentAt)) {
      result.skipped++;
      continue;
    }
    const r = await sendMessage(c.phone!, c.body);
    const firstTime = !c.sentAt;
    try {
      await db.notification.create({
        data: {
          channel: "WHATSAPP", kind: c.kind, phone: c.phone!, body: c.body,
          status: !r.ok ? "HATA" : r.test ? "TEST" : "GONDERILDI",
          error: r.error, providerId: r.providerId,
          dedupeKey: r.ok && firstTime ? c.key : null,
          userId: c.userId, studentId: c.studentId,
        },
      });
    } catch {
      // Aynı anahtar eşzamanlı bir çalışmada kaydedilmiş olabilir; mesaj yine de gönderildi.
    }
    if (!r.ok) {
      result.failed++;
      result.errors.push(`${c.recipientName}: ${r.error}`);
    } else if (r.test) result.test++;
    else result.sent++;
  }
  return result;
}

export function summary(r: Awaited<ReturnType<typeof deliver>>) {
  const parts = [];
  if (r.sent) parts.push(`${r.sent} mesaj gönderildi`);
  if (r.test) parts.push(`${r.test} mesaj test modunda kaydedildi (WhatsApp API ayarlı değil — elle göndermek için “WhatsApp'ta aç” bağlantılarını kullanın)`);
  if (r.failed) parts.push(`${r.failed} mesaj gönderilemedi`);
  if (r.skipped) parts.push(`${r.skipped} atlandı`);
  return parts.join(", ") || "Gönderilecek mesaj yok.";
}

/** "WhatsApp'ta aç" ile elle gönderilen mesajı geçmişe "ELLE" olarak kaydeder */
export async function logManual(c: Candidate) {
  try {
    await db.notification.create({
      data: {
        channel: "WHATSAPP", kind: c.kind, phone: c.phone!, body: c.body, status: "ELLE",
        dedupeKey: c.sentAt ? null : c.key, userId: c.userId, studentId: c.studentId,
      },
    });
  } catch {
    // aynı anahtar zaten kayıtlı (iki kez tıklandı) — sorun değil
  }
}
