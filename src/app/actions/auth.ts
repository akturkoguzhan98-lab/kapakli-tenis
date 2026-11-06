"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { ActionState, str } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";

// Kaba kuvvet koruması: aynı e-postayla 15 dakika içinde 5 hatalı denemede giriş 15 dakika kilitlenir
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return { error: "E-posta ve şifre girin." };
  const now = Date.now();

  const attempt = await db.loginAttempt.findUnique({ where: { email } });
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > now) {
    const min = Math.ceil((attempt.lockedUntil.getTime() - now) / 60000);
    return { error: `Çok fazla hatalı deneme yapıldı. Güvenliğiniz için ${min} dakika sonra tekrar deneyin.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    // Süresi geçmiş denemeler sıfırdan sayılır
    const fresh = !attempt || attempt.firstAt.getTime() < now - WINDOW_MS || !!attempt.lockedUntil;
    const count = fresh ? 1 : attempt.count + 1;
    const locked = count >= MAX_ATTEMPTS;
    const data = {
      count: locked ? 0 : count,
      firstAt: fresh ? new Date(now) : attempt!.firstAt,
      lockedUntil: locked ? new Date(now + LOCK_MS) : null,
    };
    await db.loginAttempt.upsert({ where: { email }, create: { email, ...data }, update: data });
    if (locked) return { error: "Çok fazla hatalı deneme yapıldı. Güvenliğiniz için 15 dakika sonra tekrar deneyin." };
    const left = MAX_ATTEMPTS - count;
    return { error: left <= 2 ? `E-posta veya şifre hatalı. ${left} deneme hakkınız kaldı.` : "E-posta veya şifre hatalı." };
  }

  if (attempt) await db.loginAttempt.delete({ where: { email } });
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
