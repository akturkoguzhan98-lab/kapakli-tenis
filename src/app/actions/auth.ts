"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { ActionState, str } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-posta veya şifre hatalı." };
  }
  await createSession(user);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/giris");
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (next.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Mevcut şifre hatalı." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Şifreniz değiştirildi." };
}
