"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionState, str } from "@/lib/forms";
import { isValidDate } from "@/lib/dates";
import { deliver, karneReminder, lessonReminders, overdueDues, summary, upcomingDues } from "@/lib/notify/reminders";
import { DEFAULT_SETTINGS, saveSettings, SettingKey } from "@/lib/notify/settings";

/** Formda işaretlenen hatırlatmaları gönderir. Mesaj metni sunucuda yeniden üretilir (istemciye güvenilmez). */
export async function sendSelected(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const source = str(fd, "source");
  const keys = new Set(fd.getAll("key").map(String));
  if (!keys.size) return { error: "Gönderilecek mesaj seçin." };
  const date = str(fd, "date");
  const all =
    source === "gecikti" ? await overdueDues()
    : source === "yaklasan" ? await upcomingDues(undefined, Number(str(fd, "days")) || undefined)
    : source === "ders" && isValidDate(date) ? await lessonReminders(date)
    : [];
  const r = await deliver(all.filter((c) => keys.has(c.key)));
  revalidatePath("/bildirimler");
  return r.failed ? { error: `${summary(r)}. ${r.errors.slice(0, 3).join(" · ")}` } : { ok: summary(r) };
}

export async function saveTemplates(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const values: Partial<Record<SettingKey, string>> = {};
  for (const k of ["tpl_aidat", "tpl_gecikti", "tpl_ders", "tpl_karne"] as const) {
    const v = str(fd, k);
    values[k] = v || DEFAULT_SETTINGS[k];
  }
  await saveSettings(values);
  revalidatePath("/bildirimler");
  return { ok: "Şablonlar kaydedildi." };
}

export async function saveAutomation(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const clamp = (v: string, min: number, max: number, def: number) => {
    const n = parseInt(v, 10);
    return String(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def);
  };
  await saveSettings({
    auto_enabled: fd.get("auto_enabled") === "on" ? "1" : "0",
    auto_lessons: fd.get("auto_lessons") === "on" ? "1" : "0",
    auto_dues_days_before: clamp(str(fd, "auto_dues_days_before"), 0, 15, 3),
    auto_overdue_repeat_days: clamp(str(fd, "auto_overdue_repeat_days"), 1, 30, 7),
  });
  revalidatePath("/bildirimler");
  return { ok: "Otomatik gönderim ayarları kaydedildi." };
}

/** Karne hazırlandığında veliye bildirim gönderir */
export async function sendKarneNotice(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("ADMIN", "COACH");
  const id = str(fd, "evaluationId");
  const e = await db.evaluation.findUnique({ where: { id } });
  if (!e) return { error: "Karne bulunamadı." };
  if (user.role === "COACH" && e.coachId !== user.id) return { error: "Bu karne size ait değil." };
  const appUrl = process.env.APP_URL || "";
  const c = await karneReminder(id, appUrl);
  if (!c) return { error: "Karne bulunamadı." };
  if (c.skipReason) return { error: c.skipReason };
  const r = await deliver([c]);
  revalidatePath(`/karne/${e.studentId}`);
  return r.failed ? { error: r.errors[0] } : { ok: summary(r) };
}
