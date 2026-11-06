import Link from "next/link";
import { db } from "@/lib/db";
import { currentPeriod, dateLabel, periodLabel, todayStr } from "@/lib/dates";
import { daySchedule } from "@/lib/queries";
import { fullName, tl } from "@/lib/format";
import { paymentStatus } from "@/lib/payments";
import { RES_TYPE_LABEL } from "@/lib/labels";
import { approveReservation, cancelReservation } from "@/app/actions/reservations";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { ScheduleList } from "@/components/ScheduleList";
import { ConfirmButton } from "@/components/ActionForm";
import { lessonReminders, overdueDues, upcomingDues } from "@/lib/notify/reminders";
import { addDays } from "@/lib/dates";

export default async function AdminDashboard() {
  const today = todayStr();
  const period = currentPeriod();
  const [students, groups, monthPayments, unpaid, pending, schedule] = await Promise.all([
    db.student.count({ where: { active: true } }),
    db.group.count({ where: { active: true } }),
    db.payment.findMany({ where: { period } }),
    db.payment.findMany({ where: { dueDate: { lt: today } }, include: { student: true }, orderBy: { dueDate: "asc" } }),
    db.reservation.findMany({
      where: { status: "BEKLEMEDE", date: { gte: today } },
      include: { court: true, user: true, student: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    daySchedule(today),
  ]);
  const [od, up, ls] = await Promise.all([overdueDues(), upcomingDues(), lessonReminders(addDays(today, 1))]);
  const waiting = (l: typeof od) => l.filter((c) => !c.skipReason && !c.sentAt).length;
  const waDues = waiting(od) + waiting(up), waLessons = waiting(ls);
  const expected = monthPayments.reduce((s, p) => s + p.amount, 0);
  const collected = monthPayments.reduce((s, p) => s + p.paidAmount, 0);
  const overdue = unpaid.filter((p) => paymentStatus(p) === "GECIKTI");

  return (
    <>
      <PageHeader title="Genel bakış" subtitle={dateLabel(today)} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent="blue" icon="users" label="Aktif öğrenci" value={students} href="/ogrenciler" />
        <Stat accent="purple" icon="layers" label="Aktif grup" value={groups} href="/gruplar" />
        <Stat accent="gold" icon="wallet" label={`${periodLabel(period)} tahsilat`} value={tl(collected)} hint={`Beklenen ${tl(expected)}`} href="/aidatlar" />
        <Stat accent="red" icon="alert" label="Geciken aidat" value={overdue.length} hint={tl(overdue.reduce((s, p) => s + p.amount - p.paidAmount, 0))} href="/aidatlar?durum=GECIKTI" tone={overdue.length ? "red" : undefined} />
      </div>

      {waDues + waLessons > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-300/30 bg-lime-300/15 px-4 py-3 text-sm text-lime-100">
          <span>
            <b>Bekleyen WhatsApp hatırlatmaları:</b>{" "}
            {[waDues ? `${waDues} aidat` : "", waLessons ? `${waLessons} yarınki ders` : ""].filter(Boolean).join(" · ")}
          </span>
          <span className="flex gap-2">
            {waDues > 0 && <Link href="/bildirimler?sekme=aidat" className="btn-primary btn-sm">Aidat hatırlat</Link>}
            {waLessons > 0 && <Link href="/bildirimler?sekme=ders" className="btn-secondary btn-sm">Ders hatırlat</Link>}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Bugünün programı" className="lg:col-span-3" actions={<Link href="/program" className="link text-xs">Haftalık</Link>}>
          <ScheduleList items={schedule} date={today} showAttendance />
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card title={`Onay bekleyen talepler (${pending.length})`}>
            {pending.length === 0 ? <Empty>Bekleyen talep yok.</Empty> : (
              <ul className="divide-y divide-white/10">
                {pending.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <div className="text-sm font-medium">{RES_TYPE_LABEL[r.type]} · {r.court.name}</div>
                    <div className="text-xs text-white/65">
                      {dateLabel(r.date)} {r.startTime}–{r.endTime} · {r.user.name}{r.student ? ` (${fullName(r.student)})` : ""}
                    </div>
                    {r.note && <div className="mt-0.5 text-xs italic text-white/65">“{r.note}”</div>}
                    <div className="mt-2 flex gap-2">
                      <form action={approveReservation}><input type="hidden" name="id" value={r.id} /><button className="btn-primary btn-sm">Onayla</button></form>
                      <form action={cancelReservation}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Talep reddedilsin mi?">Reddet</ConfirmButton></form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Geciken aidatlar" actions={<Link href="/aidatlar?durum=GECIKTI" className="link text-xs">Tümü</Link>}>
            {overdue.length === 0 ? <Empty>Geciken ödeme yok. 🎾</Empty> : (
              <ul className="divide-y divide-white/10">
                {overdue.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/ogrenciler/${p.studentId}`} className="link">{fullName(p.student)}</Link>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-white/65">{periodLabel(p.period)}</span>
                      <Badge tone="red">{tl(p.amount - p.paidAmount)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
