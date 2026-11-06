"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionState, int, optStr, str } from "@/lib/forms";
import { hashPassword } from "@/lib/password";

function extra(fd: FormData) {
  return {
    hourlyRate: Math.max(0, int(fd, "hourlyRate")),
    notifyConsent: fd.get("notifyConsent") === "on",
  };
}

const ROLES = ["ADMIN", "COACH", "PARENT"];

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("ADMIN");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role");
  const password = str(fd, "password");
  if (!name || !email) return { error: "Ad ve e-posta zorunlu." };
  if (!ROLES.includes(role)) return { error: "Geçersiz rol." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Bu e-posta zaten kayıtlı." };
  await db.user.create({
    data: { name, email, role, phone: optStr(fd, "phone"), passwordHash: await hashPassword(password), ...extra(fd) },
  });
  revalidatePath("/kullanicilar");
  redirect("/kullanicilar");
}

export async function updateUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser("ADMIN");
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role");
  const active = fd.get("active") === "on";
  const password = str(fd, "password");
  if (!name || !email) return { error: "Ad ve e-posta zorunlu." };
  if (!ROLES.includes(role)) return { error: "Geçersiz rol." };
  if (id === me.id && (role !== "ADMIN" || !active)) {
    return { error: "Kendi yönetici yetkinizi kaldıramaz veya hesabınızı pasif yapamazsınız." };
  }
  const clash = await db.user.findUnique({ where: { email } });
  if (clash && clash.id !== id) return { error: "Bu e-posta başka bir kullanıcıda kayıtlı." };
  if (password && password.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };
  await db.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
      active,
      phone: optStr(fd, "phone"),
      ...extra(fd),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath("/kullanicilar");
  return { ok: "Kaydedildi." };
}
