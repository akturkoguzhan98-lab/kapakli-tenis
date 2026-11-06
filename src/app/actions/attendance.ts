"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, optStr, str } from "@/lib/forms";
import { dayOfWeek, isValidDate, minutesBetween, todayStr } from "@/lib/dates";

const STATUSES = ["GELDI", "GELMEDI", "IZINLI"];

export async function saveAttendance(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("ADMIN", "COACH");
  const groupId = str(fd, "groupId");
  const date = str(fd, "date");
  if (!isValidDate(date)) return { error: "Geçersiz tarih." };
  if (date > todayStr()) return { error: "Gelecek tarihli derse yoklama alınamaz." };

  const group = await db.group.findUnique({ where: { id: groupId }, include: { members: { where: { student: { active: true } } } } });
  if (!group) return { error: "Grup bulunamadı." };
  if (user.role === "COACH" && group.coachId !== user.id) return { error: "Bu grup size ait değil." };
  if (dayOfWeek(date) !== group.dayOfWeek) return { error: "Bu grubun o gün dersi yok." };

  const entries = group.members.map((m) => {
    const s = str(fd, `s_${m.studentId}`);
    return { studentId: m.studentId, status: STATUSES.includes(s) ? s : "GELMEDI" };
  });

  // Not: D1 etkileşimli transaction desteklemez; işlemler sırayla yapılır
  {
    const lesson = await db.lesson.upsert({
      where: { groupId_date: { groupId, date } },
      // Antrenör ve süre o anki grup bilgisinden kopyalanır (ders saati raporu için)
      create: { groupId, date, note: optStr(fd, "note"), takenById: user.id, coachId: group.coachId, minutes: minutesBetween(group.startTime, group.endTime) },
      update: { note: optStr(fd, "note"), takenById: user.id },
    });
    // Sadece mevcut üyelerin kaydı yenilenir; gruptan ayrılanların geçmişi korunur
    await db.attendance.deleteMany({
      where: { lessonId: lesson.id, studentId: { in: entries.map((e) => e.studentId) } },
    });
    if (entries.length) await db.attendance.createMany({ data: entries.map((e) => ({ ...e, lessonId: lesson.id })) });
  }

  revalidatePath("/yoklama");
  return { ok: "Yoklama kaydedildi." };
}
