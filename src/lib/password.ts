// Şifre özeti: PBKDF2-SHA256 (Web Crypto). Cloudflare Workers'da yerleşik ve hızlıdır;
// bcrypt gibi saf JavaScript kütüphaneleri ücretsiz plandaki işlemci süresi sınırını aşar.
// Biçim: pbkdf2$<tekrar>$<tuz base64>$<özet base64>
const ITERATIONS = 100_000; // Cloudflare Workers'ın izin verdiği en yüksek değer

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return ["pbkdf2", ITERATIONS, b64(salt), b64(await derive(password, salt, ITERATIONS))].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
  const actual = await derive(password, unb64(salt), Number(iter));
  const expected = unb64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0; // sabit süreli karşılaştırma
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
