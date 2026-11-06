"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { ActionState, str } from "@/lib/forms";
import { hashPassword } from "@/lib/password";

/** Sadece hiç kullanıcı yokken çalışır: ilk yönetici hesabını oluşturur */
export async function createFirstAdmin(_: ActionState, fd: FormData): Promise<ActionState> {
  if ((await db.user.count()) > 0) redirect("/giris");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!name || !email) return { error: "Ad ve e-posta zorunlu." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (password !== str(fd, "password2")) return { error: "Şifreler aynı değil." };
  const user = await db.user.create({ data: { name, email, role: "ADMIN", passwordHash: await hashPassword(password) } });
  await createSession(user);
  redirect("/");
}
