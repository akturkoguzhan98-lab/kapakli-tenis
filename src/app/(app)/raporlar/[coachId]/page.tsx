import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { addMonths, currentPeriod, dateLabel, hoursLabel, isValidPeriod, periodLabel } from "@/lib/dates";
import { tl } from "@/lib/format";
import { coachReport, ROW_STATUS_LABEL } from "@/lib/reports";
import { Badge, Card, Empty, PageHeader, Stat, TableWrap } from "@/components/ui";

const TONE = { YAPILDI: "green", YOKLAMA_YOK: "red", PLANLI: "gray" } as const;

export default async function CoachReportPage({ params, searchParams }: { params: Promise<{ coachId: string }>; searchParams: Promise<{ ay?: string }> }) {
  const user = await requireUser("ADMIN", "COACH");
  const { coachId } = await params;
  const sp = await searchParams;
  if (user.role === "COACH" && coachId !== user.id) redirect("/raporlar");
  const period = isValidPeriod(sp.ay) ? sp.ay : currentPeriod();
  const r = await coachReport(coachId, period);
  if (!r) notFound();
  const link = (p: string) => `/raporlar/${coachId}?ay=${p}`;

  return (
    <>
      <PageHeader
        title={user.role === "COACH" ? "Ders saatlerim" : r.coach.name}
        subtitle={periodLabel(period)}
        actions={
          <>
            {user.role === "ADMIN" && <Link href={`/raporlar?ay=${period}`} className="btn-secondary">← Tüm antrenörler</Link>}
            <Link href={link(addMonths(period, -1))} className="btn-secondary">←</Link>
            <Link href={link(addMonths(period, 1))} className="btn-secondary">→</Link>
            <a href={`/raporlar-csv?ay=${period}&antrenor=${coachId}`} className="btn-primary">CSV</a>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam yapılan" value={hoursLabel(r.totalMinutes)} hint={`${r.lessonsDone} ders`} />
        <Stat label="Grup / özel" value={`${hoursLabel(r.groupMinutes)} / ${hoursLabel(r.privateMinutes)}`} />
        <Stat label="Hakediş" value={tl(r.earnings)} hint={r.coach.hourlyRate ? `${tl(r.coach.hourlyRate)} / saat` : "Saatlik ücret tanımlı değil"} />
        <Stat label="Yoklaması alınmamış" value={r.missingAttendance} tone={r.missingAttendance ? "red" : undefined} hint={r.upcoming ? `${r.upcoming} ders daha planlı` : undefined} />
      </div>
      <Card title="Ders dökümü" padded={false}>
        {r.rows.length === 0 ? <Empty>Bu ay ders yok.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead><tr><th>Tarih</th><th>Saat</th><th>Ders</th><th>Tür</th><th className="text-right">Süre</th><th className="text-right">Gelen</th><th>Durum</th></tr></thead>
              <tbody>
                {r.rows.map((x, i) => (
                  <tr key={i} className={x.status === "PLANLI" ? "text-stone-400" : ""}>
                    <td className="whitespace-nowrap">{dateLabel(x.date)}</td>
                    <td className="font-mono text-xs">{x.start}–{x.end}</td>
                    <td>{x.title}</td>
                    <td>{x.type === "GRUP" ? "Grup" : "Özel"}</td>
                    <td className="text-right">{hoursLabel(x.minutes)}</td>
                    <td className="text-right">{x.attendees ?? "—"}</td>
                    <td><Badge tone={TONE[x.status]}>{ROW_STATUS_LABEL[x.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
