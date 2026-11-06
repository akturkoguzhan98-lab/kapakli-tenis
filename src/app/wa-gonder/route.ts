import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDate } from "@/lib/dates";
import { Candidate, karneReminder, lessonReminders, logManual, overdueDues, upcomingDues } from "@/lib/notify/reminders";

/**
 * Elle WhatsApp gönderimi: mesajı sunucuda yeniden üretir, geçmişe "elle gönderildi" olarak kaydeder
 * ve hazır metinle WhatsApp'a (wa.me) yönlendirir. Kullanıcı sadece WhatsApp'ta "Gönder"e basar.
 * Kayıt oluşturduğu için sadece POST (form) ile çalışır: başka bir siteden gelen bağlantı tıklamasıyla
 * tetiklenemez (oturum çerezi SameSite=Lax, çapraz site POST isteğinde gönderilmez).
 */
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/", req.url));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "PARENT") return NextResponse.redirect(new URL("/", req.url));
  const q = req.nextUrl.searchParams;
  const source = q.get("kaynak");
  const key = q.get("anahtar");

  let list: Candidate[] = [];
  if (source === "karne") {
    const id = q.get("id") ?? "";
    const e = await db.evaluation.findUnique({ where: { id } });
    if (e && (user.role === "ADMIN" || e.coachId === user.id)) {
      const c = await karneReminder(id, process.env.APP_URL || req.nextUrl.origin);
      if (c) list = [c];
    }
  } else if (user.role === "ADMIN") {
    const date = q.get("tarih");
    list =
      source === "gecikti" ? await overdueDues()
      : source === "yaklasan" ? await upcomingDues(undefined, Number(q.get("gun")) || undefined)
      : source === "ders" && isValidDate(date) ? await lessonReminders(date)
      : [];
  }
  const c = list.find((x) => source === "karne" || x.key === key);
  if (!c || c.skipReason || !c.waUrl) {
    return new NextResponse("Mesaj bulunamadı ya da alıcının geçerli bir telefonu yok.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  await logManual(c);
  return NextResponse.redirect(c.waUrl, 303);
}
