import { db } from "./db";
import { dayOfWeek } from "./dates";

export type ScheduleItem = {
  key: string;
  kind: "GROUP" | "RES";
  start: string;
  end: string;
  title: string;
  court?: string | null;
  coach?: string | null;
  groupId?: string;
  reservation?: { id: string; type: string; status: string; userId: string; coachId: string | null };
  memberCount?: number;
  lessonTaken?: boolean;
};

/**
 * Birden çok günün dersleri ve rezervasyonları — gün sayısından bağımsız olarak sadece 2 sorgu.
 * (Haftalık program eskiden her gün için ayrı sorgu yapıyordu: 14 sorgu.) Sonuç: { "YYYY-AA-GG": [...] }
 */
export async function rangeSchedule(dates: string[], opts: { coachId?: string; studentIds?: string[] } = {}) {
  const { coachId, studentIds } = opts;
  const dows = [...new Set(dates.map(dayOfWeek))];
  const [groups, reservations] = await Promise.all([
    db.group.findMany({
      where: {
        active: true,
        dayOfWeek: { in: dows },
        ...(coachId ? { coachId } : {}),
        ...(studentIds ? { members: { some: { studentId: { in: studentIds } } } } : {}),
      },
      include: {
        coach: true,
        court: true,
        _count: { select: { members: { where: { student: { active: true } } } } },
        lessons: { where: { date: { in: dates } }, select: { date: true } },
      },
    }),
    db.reservation.findMany({
      where: {
        date: { in: dates },
        status: { not: "IPTAL" },
        ...(coachId ? { coachId } : {}),
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
      },
      include: { court: true, coach: true, student: true, user: true },
    }),
  ]);
  const out: Record<string, ScheduleItem[]> = {};
  for (const date of dates) {
    const dow = dayOfWeek(date);
    const items: ScheduleItem[] = [
      ...groups.filter((g) => g.dayOfWeek === dow).map((g) => ({
        key: `g-${g.id}`,
        kind: "GROUP" as const,
        start: g.startTime,
        end: g.endTime,
        title: g.name,
        court: g.court?.name,
        coach: g.coach?.name,
        groupId: g.id,
        memberCount: g._count.members,
        lessonTaken: g.lessons.some((l) => l.date === date),
      })),
      ...reservations.filter((r) => r.date === date).map((r) => ({
        key: `r-${r.id}`,
        kind: "RES" as const,
        start: r.startTime,
        end: r.endTime,
        title:
          r.type === "OZEL_DERS"
            ? `Özel ders${r.student ? ` · ${r.student.firstName} ${r.student.lastName}` : ""}`
            : `Kort kiralama · ${r.user.name}`,
        court: r.court.name,
        coach: r.coach?.name,
        reservation: { id: r.id, type: r.type, status: r.status, userId: r.userId, coachId: r.coachId },
      })),
    ];
    out[date] = items.sort((a, b) => a.start.localeCompare(b.start));
  }
  return out;
}

/** Tek bir günün dersleri ve rezervasyonları */
export async function daySchedule(date: string, opts: { coachId?: string; studentIds?: string[] } = {}) {
  return (await rangeSchedule([date], opts))[date];
}
