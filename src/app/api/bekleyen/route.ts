import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDays, todayStr } from "@/lib/dates";
import { lessonReminders, overdueDues, upcomingDues } from "@/lib/notify/reminders";

/**
 * Genel bakıştaki "Bekleyen WhatsApp hatırlatmaları" bandı için sayılar.
 * Ana sayfadan ayrı bir istekle alınır: işlemci yükü iki isteğe bölünür (Cloudflare ücretsiz plan sınırı).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const [od, up, ls] = await Promise.all([overdueDues(), upcomingDues(), lessonReminders(addDays(todayStr(), 1))]);
  const waiting = (l: typeof od) => l.filter((c) => !c.skipReason && !c.sentAt).length;
  return NextResponse.json({ dues: waiting(od) + waiting(up), lessons: waiting(ls) }, { headers: { "Cache-Control": "no-store" } });
}
