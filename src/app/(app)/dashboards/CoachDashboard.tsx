import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { addDays, dateLabel, todayStr } from "@/lib/dates";
import { daySchedule } from "@/lib/queries";
import { DAY_LABEL, LEVEL_LABEL } from "@/lib/labels";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { ScheduleList } from "@/components/ScheduleList";

export default async function CoachDashboard({ user }: { user: CurrentUser }) {
  const today = todayStr();
  const [todayItems, tomorrowItems, groups] = await Promise.all([
    daySchedule(today, { coachId: user.id }),
    daySchedule(addDays(today, 1), { coachId: user.id }),
    db.group.findMany({
      where: { coachId: user.id, active: true },
      include: { court: true, _count: { select: { members: { where: { student: { active: true } } } } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);
  const students = groups.reduce((s, g) => s + g._count.members, 0);
  const missing = todayItems.filter((i) => i.groupId && !i.lessonTaken).length;

  return (
    <>
      <PageHeader title={`Merhaba ${user.name.split(" ")[0]}`} subtitle={dateLabel(today)} />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat accent="green" icon="calendar" label="Bugünkü ders" value={todayItems.length} />
        <Stat accent="red" icon="check" label="Yoklama bekleyen" value={missing} tone={missing ? "red" : undefined} href="/yoklama" />
        <Stat accent="blue" icon="users" label="Gruplarımdaki öğrenci" value={students} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card title="Bugün"><ScheduleList items={todayItems} date={today} showAttendance /></Card>
        <Card title="Yarın"><ScheduleList items={tomorrowItems} date={addDays(today, 1)} /></Card>
        <Card title="Gruplarım" className="lg:col-span-2" padded={false}>
          {groups.length === 0 ? <Empty>Size atanmış grup yok.</Empty> : (
            <table className="table">
              <thead><tr><th>Grup</th><th>Gün / saat</th><th>Seviye</th><th>Kort</th><th>Öğrenci</th></tr></thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.name}</td>
                    <td>{DAY_LABEL[g.dayOfWeek]} {g.startTime}–{g.endTime}</td>
                    <td>{LEVEL_LABEL[g.level]}</td>
                    <td>{g.court?.name ?? "—"}</td>
                    <td>{g._count.members}/{g.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
