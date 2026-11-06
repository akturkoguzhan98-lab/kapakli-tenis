import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { Role, SESSION_COOKIE, signSession, verifySession } from "./session";

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await signSession({ userId: user.id, role: user.role as Role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Oturumdaki kullanıcıyı veritabanından getirir (pasif kullanıcılar reddedilir). */
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  return { ...user, role: user.role as Role };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Sayfa/aksiyon başında çağrılır; giriş yoksa veya rol uygun değilse yönlendirir. */
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  // Çerez geçerli ama kullanıcı silinmiş/pasif ise çerezi temizlemek için /cikis
  if (!user) redirect("/cikis");
  if (roles.length && !roles.includes(user.role)) redirect("/");
  return user;
}
