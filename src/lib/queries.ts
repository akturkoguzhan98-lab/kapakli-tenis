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

/** Bir günün tüm dersleri ve rezervasyonları (isteğe bağlı antrenör/öğrenci filtresi) */
export async function daySchedule(date: string, opts: { coachId?: string; studentIds?: string[] } = {}) {
  const { coachId, studentIds } = opts;
  const groups = await db.group.findMany({
    where: {
      active: true,
      dayOfWeek: dayOfWeek(date),
      ...(coachId ? { coachId } : {}),
      ...(studentIds ? { members: { some: { studentId: { in: studentIds } } } } : {}),
    },
    include: {
      coach: true,
      court: true,
      _count: { select: { members: { where: { student: { active: true } } } } },
      lessons: { where: { date }, select: { id: true } },
    },
  });
  const reservations = await db.reservation.findMany({
    where: {
      date,
      status: { not: "IPTAL" },
      ...(coachId ? { coachId } : {}),
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
    },
    include: { court: true, coach: true, student: true, user: true },
  });
  const items: ScheduleItem[] = [
    ...groups.map((g) => ({
      key: `g-${g.id}`,
      kind: "GROUP" as const,
      start: g.startTime,
      end: g.endTime,
      title: g.name,
      court: g.court?.name,
      coach: g.coach?.name,
      groupId: g.id,
      memberCount: g._count.members,
      lessonTaken: g.lessons.length > 0,
    })),
    ...reservations.map((r) => ({
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
  return items.sort((a, b) => a.start.localeCompare(b.start));
}
