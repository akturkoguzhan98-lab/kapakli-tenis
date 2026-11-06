import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { currentPeriod, isValidPeriod } from "@/lib/dates";
import { allCoachReports, coachReport, CoachReport, ROW_STATUS_LABEL } from "@/lib/reports";

// Türkçe Excel ";" ayırıcı ve UTF-8 BOM bekler
function csv(rows: (string | number)[][]) {
  return "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
}
const hours = (m: number) => (m / 60).toFixed(2).replace(".", ",");

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "COACH")) return new NextResponse("Yetkisiz", { status: 401 });
  const p = req.nextUrl.searchParams.get("ay");
  const period = isValidPeriod(p) ? p : currentPeriod();
  let coachId = req.nextUrl.searchParams.get("antrenor");
  if (user.role === "COACH") coachId = user.id;

  let reports: CoachReport[];
  if (coachId) {
    const r = await coachReport(coachId, period);
    reports = r ? [r] : [];
  } else reports = await allCoachReports(period);

  const rows: (string | number)[][] = [["Antrenör", "Tarih", "Başlangıç", "Bitiş", "Ders", "Tür", "Süre (saat)", "Gelen öğrenci", "Durum"]];
  for (const r of reports) {
    for (const x of r.rows) {
      rows.push([r.coach.name, x.date, x.start, x.end, x.title, x.type === "GRUP" ? "Grup" : "Özel", hours(x.minutes), x.attendees ?? "", ROW_STATUS_LABEL[x.status]]);
    }
  }
  rows.push([]);
  rows.push(["ÖZET", "", "", "", "", "", "Yapılan saat", "Saatlik ücret", "Hakediş (TL)"]);
  for (const r of reports) rows.push([r.coach.name, "", "", "", "", "", hours(r.totalMinutes), r.coach.hourlyRate, r.earnings]);

  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ders-saatleri-${period}${coachId ? "-" + coachId.slice(-6) : ""}.csv"`,
    },
  });
}
