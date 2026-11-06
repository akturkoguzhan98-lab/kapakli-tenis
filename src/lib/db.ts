import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Veritabanı: Cloudflare D1. Bağlantı her istekte Cloudflare ortamından (env.DB) alınır.
// Aynı D1 bağlantısı için Prisma istemcisi tekrar kullanılır.
const clients = new WeakMap<object, PrismaClient>();

function client(): PrismaClient {
  const d1 = getCloudflareContext().env.DB;
  let c = clients.get(d1);
  if (!c) {
    c = new PrismaClient({ adapter: new PrismaD1(d1) });
    clients.set(d1, c);
  }
  return c;
}

/** Her yerde `db.student.findMany(...)` şeklinde kullanılır */
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const c = client();
    const v = Reflect.get(c, prop);
    return typeof v === "function" ? v.bind(c) : v;
  },
});

/** D1 tek sorguda en fazla 100 parametreye izin verir; büyük listeleri parçalara bölmek için */
export function chunk<T>(arr: T[], size = 25): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
