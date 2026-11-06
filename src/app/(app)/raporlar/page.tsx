import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { addMonths, currentPeriod, hoursLabel, isValidPeriod, periodLabel } from "@/lib/dates";
import { tl } from "@/lib/format";
import { allCoachReports } from "@/lib/reports";
import { Badge, Card, Empty, PageHeader, Stat, TableWrap } from "@/components/ui";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requireUser("ADMIN", "COACH");
  const sp = await searchParams;
  const period = isValidPeriod(sp.ay) ? sp.ay : currentPeriod();
  if (user.role === "COACH") redirect(`/raporlar/${user.id}?ay=${period}`);

  const reports = await allCoachReports(period);
  const total = reports.reduce((s, r) => s + r.totalMinutes, 0);
  const earnings = reports.reduce((s, r) => s + r.earnings, 0);
  const missing = reports.reduce((s, r) => s + r.missingAttendance, 0);

  return (
    <>
      <PageHeader
        title="Antrenör ders saati raporu"
        subtitle={periodLabel(period)}
        actions={
          <>
            <Link href={`/raporlar?ay=${addMonths(period, -1)}`} className="btn-secondary">← {periodLabel(addMonths(period, -1))}</Link>
            <Link href={`/raporlar?ay=${addMonths(period, 1)}`} className="btn-secondary">{periodLabel(addMonths(period, 1))} →</Link>
            <a href={`/raporlar-csv?ay=${period}`} className="btn-primary">Excel'e aktar (CSV)</a>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam ders saati" value={hoursLabel(total)} />
        <Stat label="Yapılan ders" value={reports.reduce((s, r) => s + r.lessonsDone, 0)} />
        <Stat label="Toplam hakediş" value={tl(earnings)} hint="Saatlik ücret × yapılan saat" />
        <Stat label="Yoklaması alınmamış ders" value={missing} tone={missing ? "red" : undefined} hint="Hakedişe dahil edilmedi" />
      </div>
      <Card padded={false}>
        {reports.length === 0 ? <Empty>Antrenör kaydı yok.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr><th>Antrenör</th><th className="text-right">Grup dersi</th><th className="text-right">Özel ders</th><th className="text-right">Toplam</th><th className="text-right">Saatlik ücret</th><th className="text-right">Hakediş</th><th>Uyarı</th></tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.coach.id} className="hover:bg-stone-50">
                    <td><Link href={`/raporlar/${r.coach.id}?ay=${period}`} className="link">{r.coach.name}</Link></td>
                    <td className="text-right">{hoursLabel(r.groupMinutes)}</td>
                    <td className="text-right">{hoursLabel(r.privateMinutes)}</td>
                    <td className="text-right font-semibold">{hoursLabel(r.totalMinutes)}</td>
                    <td className="text-right">{r.coach.hourlyRate ? tl(r.coach.hourlyRate) : <Link href={`/kullanicilar/${r.coach.id}`} className="text-xs text-clay-700 hover:underline">Ücret girin</Link>}</td>
                    <td className="text-right font-semibold">{tl(r.earnings)}</td>
                    <td>{r.missingAttendance > 0 && <Badge tone="red">{r.missingAttendance} ders yoklamasız</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <p className="mt-3 text-xs text-stone-500">
        Grup dersleri yoklaması alındığında “yapıldı” sayılır. Özel dersler, onaylı ve tarihi geçmiş kort rezervasyonlarından gelir.
      </p>
    </>
  );
}
