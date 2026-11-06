import "server-only";
import { db } from "./db";
import { addDays, dayOfWeek, minutesBetween, monthRange, nowTimeStr, todayStr } from "./dates";
import { fullName } from "./format";

export type ReportRow = {
  date: string;
  type: "GRUP" | "OZEL";
  title: string;
  start: string;
  end: string;
  minutes: number;
  attendees: number | null; // grup dersinde gelen öğrenci sayısı
  status: "YAPILDI" | "YOKLAMA_YOK" | "PLANLI";
};

export type CoachReport = {
  coach: { id: string; name: string; hourlyRate: number };
  rows: ReportRow[];
  groupMinutes: number;
  privateMinutes: number;
  totalMinutes: number;
  lessonsDone: number;
  missingAttendance: number;
  upcoming: number;
  earnings: number;
};

/**
 * Bir antrenörün aylık ders saatleri.
 * - Grup dersi: yoklaması alınmış dersler "yapıldı" sayılır. Geçmiş tarihli ama yoklaması alınmamış dersler ayrıca listelenir.
 * - Özel ders: onaylı ve tarihi geçmiş rezervasyonlar "yapıldı" sayılır.
 * - Hakediş = yapılan toplam saat × saatlik ücret.
 */
export async function coachReport(coachId: string, period: string): Promise<CoachReport | null> {
  const coach = await db.user.findFirst({ where: { id: coachId, role: "COACH" } });
  if (!coach) return null;
  const [from, to] = monthRange(period);
  const today = todayStr();
  const now = nowTimeStr();
  // Bugünkü ders bitmeden "yoklama alınmadı" sayılmaz
  const isPast = (date: string, end: string) => date < today || (date === today && end <= now);

  const lessons = await db.lesson.findMany({
    where: {
      date: { gte: from, lte: to },
      OR: [{ coachId }, { coachId: null, group: { coachId } }],
    },
    include: { group: true, attendances: true },
  });
  const privates = await db.reservation.findMany({
    where: { coachId, type: "OZEL_DERS", status: "ONAYLI", date: { gte: from, lte: to } },
    include: { student: true },
  });
  const groups = await db.group.findMany({ where: { coachId, active: true } });

  const rows: ReportRow[] = [];
  const done = new Set<string>();
  for (const l of lessons) {
    done.add(`${l.groupId}:${l.date}`);
    rows.push({
      date: l.date, type: "GRUP", title: l.group.name, start: l.group.startTime, end: l.group.endTime,
      minutes: l.minutes ?? minutesBetween(l.group.startTime, l.group.endTime),
      attendees: l.attendances.filter((a) => a.status === "GELDI").length,
      status: "YAPILDI",
    });
  }
  // Planlanmış ama yoklaması alınmamış / henüz yapılmamış grup dersleri
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const g of groups) {
      if (g.dayOfWeek !== dayOfWeek(d) || done.has(`${g.id}:${d}`)) continue;
      rows.push({
        date: d, type: "GRUP", title: g.name, start: g.startTime, end: g.endTime,
        minutes: minutesBetween(g.startTime, g.endTime), attendees: null,
        status: isPast(d, g.endTime) ? "YOKLAMA_YOK" : "PLANLI",
      });
    }
  }
  for (const r of privates) {
    rows.push({
      date: r.date, type: "OZEL", title: `Özel ders${r.student ? ` · ${fullName(r.student)}` : ""}`,
      start: r.startTime, end: r.endTime, minutes: minutesBetween(r.startTime, r.endTime), attendees: null,
      status: isPast(r.date, r.endTime) ? "YAPILDI" : "PLANLI",
    });
  }
  rows.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  const doneRows = rows.filter((r) => r.status === "YAPILDI");
  const groupMinutes = doneRows.filter((r) => r.type === "GRUP").reduce((s, r) => s + r.minutes, 0);
  const privateMinutes = doneRows.filter((r) => r.type === "OZEL").reduce((s, r) => s + r.minutes, 0);
  const totalMinutes = groupMinutes + privateMinutes;
  return {
    coach: { id: coach.id, name: coach.name, hourlyRate: coach.hourlyRate },
    rows,
    groupMinutes,
    privateMinutes,
    totalMinutes,
    lessonsDone: doneRows.length,
    missingAttendance: rows.filter((r) => r.status === "YOKLAMA_YOK").length,
    upcoming: rows.filter((r) => r.status === "PLANLI").length,
    earnings: Math.round((totalMinutes / 60) * coach.hourlyRate),
  };
}

export async function allCoachReports(period: string) {
  const coaches = await db.user.findMany({ where: { role: "COACH" }, orderBy: { name: "asc" } });
  const reports = await Promise.all(coaches.map((c) => coachReport(c.id, period)));
  return reports.filter((r): r is CoachReport => !!r);
}

export const ROW_STATUS_LABEL = { YAPILDI: "Yapıldı", YOKLAMA_YOK: "Yoklama alınmadı", PLANLI: "Planlı" } as const;
