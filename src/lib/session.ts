// Edge (middleware) ve Node tarafında ortak kullanılan JWT yardımcıları
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "kta_oturum";
export type Role = "ADMIN" | "COACH" | "PARENT";
export type SessionPayload = { userId: string; role: Role; name: string };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET en az 32 karakter olmalı (.env dosyasına bakın)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
