"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, optStr, str } from "@/lib/forms";
import { OPEN_FROM, OPEN_UNTIL } from "@/lib/labels";
import { dayOfWeek, isValidDate, isValidTime, nowTimeStr, overlaps, todayStr } from "@/lib/dates";


/** Kortun o tarih/saatte boş olup olmadığını kontrol eder. Boşsa null, değilse hata mesajı döner. */
async function courtConflict(courtId: string, date: string, start: string, end: string, ignoreId?: string) {
  const res = await db.reservation.findMany({
    where: { courtId, date, status: { not: "IPTAL" }, NOT: ignoreId ? { id: ignoreId } : undefined },
  });
  if (res.some((r) => overlaps(r.startTime, r.endTime, start, end))) return "Kort bu saatte dolu (rezervasyon var).";
  const groups = await db.group.findMany({ where: { courtId, active: true, dayOfWeek: dayOfWeek(date) } });
  const g = groups.find((g) => overlaps(g.startTime, g.endTime, start, end));
  if (g) return `Kort bu saatte "${g.name}" grup dersine ayrılmış.`;
  return null;
}

export async function createReservation(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const courtId = str(fd, "courtId");
  const date = str(fd, "date");
  const startTime = str(fd, "startTime");
  const endTime = str(fd, "endTime");
  let type = str(fd, "type") === "OZEL_DERS" ? "OZEL_DERS" : "KIRALAMA";
  let coachId = optStr(fd, "coachId");
  const studentId = optStr(fd, "studentId");

  if (!isValidDate(date)) return { error: "Geçersiz tarih." };
  if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
    return { error: "Başlangıç saati bitişten önce olmalı." };
  }
  if (startTime < OPEN_FROM || endTime > OPEN_UNTIL) return { error: `Kortlar ${OPEN_FROM}–${OPEN_UNTIL} arası açık.` };
  const today = todayStr();
  if (date < today || (date === today && startTime < nowTimeStr())) return { error: "Geçmiş saate rezervasyon yapılamaz." };

  const court = await db.court.findUnique({ where: { id: courtId } });
  if (!court || !court.active) return { error: "Kort seçin." };

  if (user.role === "COACH") {
    type = "OZEL_DERS";
    coachId = user.id;
  }
  if (type === "OZEL_DERS" && !coachId && user.role !== "PARENT") return { error: "Özel ders için antrenör seçin." };
  if (user.role === "PARENT" && studentId) {
    const child = await db.student.findFirst({ where: { id: studentId, parentId: user.id } });
    if (!child) return { error: "Öğrenci size bağlı değil." };
  }
  if (coachId) {
    const coach = await db.user.findFirst({ where: { id: coachId, role: "COACH", active: true } });
    if (!coach) return { error: "Antrenör bulunamadı." };
    const busy = await db.reservation.findMany({ where: { coachId, date, status: { not: "IPTAL" } } });
    const busyGroups = await db.group.findMany({ where: { coachId, active: true, dayOfWeek: dayOfWeek(date) } });
    if (
      busy.some((r) => overlaps(r.startTime, r.endTime, startTime, endTime)) ||
      busyGroups.some((g) => overlaps(g.startTime, g.endTime, startTime, endTime))
    ) {
      return { error: "Antrenör bu saatte başka bir derste." };
    }
  }

  const conflict = await courtConflict(courtId, date, startTime, endTime);
  if (conflict) return { error: conflict };

  await db.reservation.create({
    data: {
      courtId,
      date,
      startTime,
      endTime,
      type,
      coachId: type === "OZEL_DERS" ? coachId : null,
      studentId,
      note: optStr(fd, "note"),
      userId: user.id,
      // Veli talepleri yönetici onayına düşer
      status: user.role === "PARENT" ? "BEKLEMEDE" : "ONAYLI",
    },
  });
  revalidatePath("/kortlar");
  return { ok: user.role === "PARENT" ? "Talebiniz alındı, onaylanınca kesinleşecek." : "Rezervasyon oluşturuldu." };
}

export async function cancelReservation(fd: FormData) {
  const user = await requireUser();
  const r = await db.reservation.findUnique({ where: { id: str(fd, "id") } });
  if (!r) return;
  const mine = r.userId === user.id || r.coachId === user.id;
  if (user.role !== "ADMIN" && !mine) return;
  await db.reservation.update({ where: { id: r.id }, data: { status: "IPTAL" } });
  revalidatePath("/kortlar");
  revalidatePath("/");
}

export async function approveReservation(fd: FormData) {
  await requireUser("ADMIN");
  const r = await db.reservation.findUnique({ where: { id: str(fd, "id") } });
  if (!r || r.status !== "BEKLEMEDE") return;
  await db.reservation.update({ where: { id: r.id }, data: { status: "ONAYLI" } });
  revalidatePath("/kortlar");
  revalidatePath("/");
}

export async function createCourt(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const name = str(fd, "name");
  if (!name) return { error: "Kort adı zorunlu." };
  const surface = ["TOPRAK", "SERT", "CIM"].includes(str(fd, "surface")) ? str(fd, "surface") : "TOPRAK";
  await db.court.create({ data: { name, surface, indoor: fd.get("indoor") === "on" } });
  revalidatePath("/kortlar");
  return { ok: "Kort eklendi." };
}

export async function toggleCourt(fd: FormData) {
  await requireUser("ADMIN");
  const c = await db.court.findUnique({ where: { id: str(fd, "id") } });
  if (!c) return;
  await db.court.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath("/kortlar");
}
