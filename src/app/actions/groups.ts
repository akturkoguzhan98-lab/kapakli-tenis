"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, int, optStr, str } from "@/lib/forms";
import { LEVELS } from "@/lib/labels";
import { isValidTime, overlaps } from "@/lib/dates";

async function readGroup(fd: FormData, ignoreId?: string): Promise<{ error: string } | { data: any }> {
  const level = str(fd, "level");
  const data = {
    name: str(fd, "name"),
    level: (LEVELS as readonly string[]).includes(level) ? level : "BASLANGIC",
    dayOfWeek: int(fd, "dayOfWeek"),
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime"),
    capacity: Math.max(1, int(fd, "capacity", 6)),
    coachId: optStr(fd, "coachId"),
    courtId: optStr(fd, "courtId"),
  };
  if (!data.name) return { error: "Grup adı zorunlu." };
  if (data.dayOfWeek < 1 || data.dayOfWeek > 7) return { error: "Gün seçin." };
  if (!isValidTime(data.startTime) || !isValidTime(data.endTime) || data.startTime >= data.endTime) {
    return { error: "Başlangıç saati bitişten önce olmalı." };
  }
  // Aynı gün/saatte aynı kort veya aynı antrenör başka grupta mı?
  const sameDay = await db.group.findMany({
    where: { active: true, dayOfWeek: data.dayOfWeek, NOT: ignoreId ? { id: ignoreId } : undefined },
  });
  for (const g of sameDay) {
    if (!overlaps(g.startTime, g.endTime, data.startTime, data.endTime)) continue;
    if (data.courtId && g.courtId === data.courtId) return { error: `Kort bu saatte "${g.name}" grubunda dolu.` };
    if (data.coachId && g.coachId === data.coachId) return { error: `Antrenör bu saatte "${g.name}" grubunda.` };
  }
  return { data };
}

export async function createGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const r = await readGroup(fd);
  if ("error" in r) return r;
  const g = await db.group.create({ data: r.data });
  revalidatePath("/gruplar");
  redirect(`/gruplar/${g.id}`);
}

export async function updateGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const id = str(fd, "id");
  const r = await readGroup(fd, id);
  if ("error" in r) return r;
  await db.group.update({ where: { id }, data: { ...r.data, active: fd.get("active") === "on" } });
  revalidatePath("/gruplar");
  revalidatePath(`/gruplar/${id}`);
  return { ok: "Kaydedildi." };
}

export async function addMember(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const groupId = str(fd, "groupId");
  const studentId = str(fd, "studentId");
  if (!studentId) return { error: "Öğrenci seçin." };
  const group = await db.group.findUnique({ where: { id: groupId }, include: { _count: { select: { members: true } } } });
  if (!group) return { error: "Grup bulunamadı." };
  if (group._count.members >= group.capacity) return { error: `Grup kontenjanı (${group.capacity}) dolu.` };
  await db.groupMember.upsert({
    where: { groupId_studentId: { groupId, studentId } },
    create: { groupId, studentId },
    update: {},
  });
  revalidatePath(`/gruplar/${groupId}`);
  return { ok: "Öğrenci eklendi." };
}

export async function removeMember(fd: FormData) {
  await requireUser("ADMIN");
  const groupId = str(fd, "groupId");
  const studentId = str(fd, "studentId");
  await db.groupMember.deleteMany({ where: { groupId, studentId } });
  revalidatePath(`/gruplar/${groupId}`);
}
