"use server";

import { revalidatePath } from "next/cache";
import { chunk, db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, int, optStr, str } from "@/lib/forms";
import { isValidDate, isValidPeriod, todayStr } from "@/lib/dates";
import { PAY_METHOD_LABEL } from "@/lib/labels";

/** Seçilen dönem için aktif ve ücreti tanımlı tüm öğrencilere aidat oluşturur (var olanlara dokunmaz). */
export async function generateDues(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const period = str(fd, "period");
  if (!isValidPeriod(period)) return { error: "Geçersiz dönem." };
  const dueDay = Math.min(28, Math.max(1, int(fd, "dueDay", 10)));
  const dueDate = `${period}-${String(dueDay).padStart(2, "0")}`;

  const students = await db.student.findMany({ where: { active: true, monthlyFee: { gt: 0 } } });
  const existing = new Set(
    (await db.payment.findMany({ where: { period }, select: { studentId: true } })).map((p) => p.studentId),
  );
  const toCreate = students.filter((s) => !existing.has(s.id));
  for (const part of chunk(toCreate, 20)) {
    await db.payment.createMany({
      data: part.map((s) => ({ studentId: s.id, period, amount: s.monthlyFee, dueDate })),
    });
  }
  revalidatePath("/aidatlar");
  return { ok: toCreate.length ? `${toCreate.length} öğrenci için aidat oluşturuldu.` : "Tüm aktif öğrencilerin bu dönem aidatı zaten var." };
}

export async function recordPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const id = str(fd, "id");
  const amount = int(fd, "amount");
  const method = str(fd, "method");
  const paidAt = str(fd, "paidAt") || todayStr();
  if (amount <= 0) return { error: "Tutar girin." };
  if (!(method in PAY_METHOD_LABEL)) return { error: "Ödeme yöntemi seçin." };
  if (!isValidDate(paidAt)) return { error: "Geçersiz tarih." };
  const p = await db.payment.findUnique({ where: { id } });
  if (!p) return { error: "Kayıt bulunamadı." };
  if (p.paidAmount + amount > p.amount) return { error: `En fazla ${p.amount - p.paidAmount} TL tahsil edilebilir.` };
  await db.payment.update({
    where: { id },
    data: { paidAmount: p.paidAmount + amount, paidAt, method, note: optStr(fd, "note") ?? p.note },
  });
  revalidatePath("/aidatlar");
  revalidatePath(`/ogrenciler/${p.studentId}`);
  return { ok: "Ödeme kaydedildi." };
}

export async function resetPayment(fd: FormData) {
  await requireUser("ADMIN");
  const p = await db.payment.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  await db.payment.update({ where: { id: p.id }, data: { paidAmount: 0, paidAt: null, method: null } });
  revalidatePath("/aidatlar");
}

export async function deletePayment(fd: FormData) {
  await requireUser("ADMIN");
  const p = await db.payment.findUnique({ where: { id: str(fd, "id") } });
  if (!p || p.paidAmount > 0) return; // tahsilatı olan kayıt silinmez
  await db.payment.delete({ where: { id: p.id } });
  revalidatePath("/aidatlar");
}
