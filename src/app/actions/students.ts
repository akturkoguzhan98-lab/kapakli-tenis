"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, int, optStr, str } from "@/lib/forms";
import { LEVELS } from "@/lib/labels";
import { isValidDate } from "@/lib/dates";

function readStudent(fd: FormData) {
  const level = str(fd, "level");
  const birthDate = optStr(fd, "birthDate");
  return {
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    birthDate: birthDate && isValidDate(birthDate) ? birthDate : null,
    phone: optStr(fd, "phone"),
    level: (LEVELS as readonly string[]).includes(level) ? level : "BASLANGIC",
    monthlyFee: Math.max(0, int(fd, "monthlyFee")),
    notes: optStr(fd, "notes"),
    parentId: optStr(fd, "parentId"),
  };
}

export async function createStudent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const data = readStudent(fd);
  if (!data.firstName || !data.lastName) return { error: "Ad ve soyad zorunlu." };
  const s = await db.student.create({ data });
  revalidatePath("/ogrenciler");
  redirect(`/ogrenciler/${s.id}`);
}

export async function updateStudent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const id = str(fd, "id");
  const data = readStudent(fd);
  if (!data.firstName || !data.lastName) return { error: "Ad ve soyad zorunlu." };
  await db.student.update({ where: { id }, data: { ...data, active: fd.get("active") === "on" } });
  revalidatePath("/ogrenciler");
  revalidatePath(`/ogrenciler/${id}`);
  return { ok: "Kaydedildi." };
}
