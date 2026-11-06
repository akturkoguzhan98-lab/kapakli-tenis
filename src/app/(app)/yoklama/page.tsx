import Link from "@/components/Link";
import { requireUser } from "@/lib/auth";
import { addDays, dateLabel, isValidDate, todayStr } from "@/lib/dates";
import { daySchedule } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { ScheduleList } from "@/components/ScheduleList";

export default async function AttendanceIndex({ searchParams }: { searchParams: Promise<{ tarih?: string }> }) {
  const user = await requireUser("ADMIN", "COACH");
  const sp = await searchParams;
  const today = todayStr();
  const date = isValidDate(sp.tarih) ? sp.tarih : today;
  const items = (await daySchedule(date, user.role === "COACH" ? { coachId: user.id } : {})).filter((i) => i.kind === "GROUP");
  return (
    <>
      <PageHeader
        title="Yoklama"
        subtitle={dateLabel(date)}
        actions={
          <>
            <Link href={`/yoklama?tarih=${addDays(date, -1)}`} className="btn-secondary">← Önceki gün</Link>
            {date !== today && <Link href="/yoklama" className="btn-secondary">Bugün</Link>}
            {date < today && <Link href={`/yoklama?tarih=${addDays(date, 1)}`} className="btn-secondary">Sonraki gün →</Link>}
          </>
        }
      />
      <Card title="Grup dersleri">
        <ScheduleList items={items} date={date} showAttendance={date <= today} />
      </Card>
    </>
  );
}
