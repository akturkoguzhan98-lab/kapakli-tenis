import Link from "next/link";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { ageFrom, dateLabel, periodLabel, todayStr } from "@/lib/dates";
import { fullName, tl } from "@/lib/format";
import { ATTENDANCE_LABEL, DAY_LABEL, LEVEL_LABEL, RES_STATUS_LABEL, RES_TYPE_LABEL } from "@/lib/labels";
import { PAY_STATUS_LABEL, paymentStatus } from "@/lib/payments";
import { cancelReservation } from "@/app/actions/reservations";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/ActionForm";

const PAY_TONE = { ODENDI: "green", KISMI: "amber", BEKLIYOR: "gray", GECIKTI: "red" } as const;
const ATT_TONE: Record<string, "green" | "red" | "amber"> = { GELDI: "green", GELMEDI: "red", IZINLI: "amber" };

export default async function ParentDashboard({ user }: { user: CurrentUser }) {
  const today = todayStr();
  const children = await db.student.findMany({
    where: { parentId: user.id, active: true },
    include: {
      groups: { include: { group: { include: { coach: true, court: true } } } },
      attendances: { include: { lesson: true }, orderBy: { lesson: { date: "desc" } }, take: 10 },
      payments: { orderBy: { period: "desc" }, take: 6 },
      evaluations: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { firstName: "asc" },
  });
  const reservations = await db.reservation.findMany({
    where: { date: { gte: today }, status: { not: "IPTAL" }, OR: [{ userId: user.id }, { student: { parentId: user.id } }] },
    include: { court: true, coach: true, student: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return (
    <>
      <PageHeader
        title={`Hoş geldiniz, ${user.name.split(" ")[0]}`}
        subtitle={dateLabel(today)}
        actions={<Link href="/kortlar" className="btn-primary">Kort / özel ders talebi</Link>}
      />
      {children.length === 0 && <Card><Empty>Hesabınıza bağlı öğrenci bulunmuyor. Akademi yönetimiyle iletişime geçin.</Empty></Card>}

      <div className="space-y-6">
        {children.map((c) => {
          const total = c.attendances.length;
          const present = c.attendances.filter((a) => a.status === "GELDI").length;
          const age = ageFrom(c.birthDate);
          return (
            <section key={c.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-court-50 px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">{fullName(c)}</h2>
                  <p className="text-xs text-stone-600">{age !== null ? `${age} yaş · ` : ""}{LEVEL_LABEL[c.level]} seviye</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {total > 0 && <Badge tone="green">Son {total} derste devam: %{Math.round((present / total) * 100)}</Badge>}
                  {c.evaluations[0] && <Link href={`/karne/${c.id}`} className="btn-secondary btn-sm">Gelişim karnesi · {c.evaluations[0].term}</Link>}
                </div>
              </div>
              <div className="grid gap-6 p-4 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-stone-500">Haftalık dersler</h3>
                  {c.groups.length === 0 ? <p className="text-sm text-stone-500">Henüz bir gruba kayıtlı değil.</p> : (
                    <ul className="space-y-2 text-sm">
                      {c.groups.map(({ group: g }) => (
                        <li key={g.id}>
                          <div className="font-medium">{DAY_LABEL[g.dayOfWeek]} {g.startTime}–{g.endTime}</div>
                          <div className="text-xs text-stone-500">{g.name} · {g.court?.name ?? "Kort belirlenecek"} · {g.coach?.name ?? "Antrenör belirlenecek"}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-stone-500">Son yoklamalar</h3>
                  {total === 0 ? <p className="text-sm text-stone-500">Kayıt yok.</p> : (
                    <ul className="space-y-1 text-sm">
                      {c.attendances.map((a) => (
                        <li key={a.lessonId} className="flex justify-between">
                          <span>{dateLabel(a.lesson.date)}</span>
                          <Badge tone={ATT_TONE[a.status]}>{ATTENDANCE_LABEL[a.status]}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-stone-500">Aidatlar</h3>
                  {c.payments.length === 0 ? <p className="text-sm text-stone-500">Kayıt yok.</p> : (
                    <ul className="space-y-1 text-sm">
                      {c.payments.map((p) => {
                        const st = paymentStatus(p);
                        return (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span>{periodLabel(p.period)} <span className="text-xs text-stone-500">{tl(p.amount)}</span></span>
                            <Badge tone={PAY_TONE[st]}>{PAY_STATUS_LABEL[st]}</Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        <Card title="Yaklaşan rezervasyonlar">
          {reservations.length === 0 ? <Empty>Yaklaşan rezervasyon yok.</Empty> : (
            <ul className="divide-y divide-stone-100">
              {reservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{dateLabel(r.date)} · {r.startTime}–{r.endTime}</div>
                    <div className="text-xs text-stone-500">
                      {RES_TYPE_LABEL[r.type]} · {r.court.name}{r.student ? ` · ${fullName(r.student)}` : ""}{r.coach ? ` · ${r.coach.name}` : ""}
                    </div>
                  </div>
                  <Badge tone={r.status === "ONAYLI" ? "green" : "amber"}>{RES_STATUS_LABEL[r.status]}</Badge>
                  {r.userId === user.id && (
                    <form action={cancelReservation}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message="Rezervasyon iptal edilsin mi?">İptal</ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
