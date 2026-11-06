import { NextRequest, NextResponse } from "next/server";
import { addDays, todayStr } from "@/lib/dates";
import { deliver, lessonReminders, overdueDues, upcomingDues } from "@/lib/notify/reminders";
import { getSettings } from "@/lib/notify/settings";
import { whatsappApiStatus } from "@/lib/notify/providers";

/**
 * Otomatik hatırlatmalar. Günde bir kez (ör. 18:00) çağrılmalı:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://alanadiniz/api/cron/hatirlatmalar
 * Aynı hatırlatma iki kez gönderilmez; günde birden fazla çağrılması sorun yaratmaz.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const st = await getSettings();
  if (st.auto_enabled !== "1") return NextResponse.json({ skipped: "Otomatik gönderim kapalı" });
  if (!whatsappApiStatus()) return NextResponse.json({ skipped: "WhatsApp API ayarlı değil (elle gönderim modu)" });

  const dues = await deliver([...(await upcomingDues(st)), ...(await overdueDues(st))], { onlyNew: true });
  const lessons = st.auto_lessons === "1"
    ? await deliver(await lessonReminders(addDays(todayStr(), 1), st), { onlyNew: true })
    : null;
  return NextResponse.json({ date: todayStr(), dues, lessons });
}

export const GET = run;
export const POST = run;
