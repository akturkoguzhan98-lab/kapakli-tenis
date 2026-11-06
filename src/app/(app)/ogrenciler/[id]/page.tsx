import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ageFrom, dateLabel, periodLabel } from "@/lib/dates";
import { fullName, tl } from "@/lib/format";
import { ATTENDANCE_LABEL, DAY_LABEL, PAY_METHOD_LABEL } from "@/lib/labels";
import { PAY_STATUS_LABEL, paymentStatus } from "@/lib/payments";
import { updateStudent } from "@/app/actions/students";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, PageHeader, Stat, TableWrap } from "@/components/ui";
import { StudentFields } from "@/components/StudentFields";

const PAY_TONE = { ODENDI: "green", KISMI: "amber", BEKLIYOR: "gray", GECIKTI: "red" } as const;
const ATT_TONE: Record<string, "green" | "red" | "amber"> = { GELDI: "green", GELMEDI: "red", IZINLI: "amber" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const s = await db.student.findUnique({
    where: { id },
    include: {
      parent: true,
      groups: { include: { group: { include: { coach: true } } } },
      attendances: { include: { lesson: { include: { group: true } } }, orderBy: { lesson: { date: "desc" } }, take: 30 },
      payments: { orderBy: { period: "desc" } },
    },
  });
  if (!s) notFound();
  const parents = await db.user.findMany({ where: { role: "PARENT", active: true }, orderBy: { name: "asc" } });
  const present = s.attendances.filter((a) => a.status === "GELDI").length;
  const debt = s.payments.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
  const age = ageFrom(s.birthDate);

  return (
    <>
      <PageHeader
        title={fullName(s)}
        subtitle={<>{age !== null ? `${age} yaş · ` : ""}{s.parent ? `Veli: ${s.parent.name}${s.parent.phone ? ` (${s.parent.phone})` : ""}` : "Veli tanımlı değil"}</>}
        actions={<Link href="/ogrenciler" className="btn-secondary">← Öğrenciler</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent="purple" icon="layers" label="Grup sayısı" value={s.groups.length} hint={s.groups.map((g) => `${DAY_LABEL[g.group.dayOfWeek]} ${g.group.startTime}`).join(", ")} />
        <Stat accent="green" icon="check" label="Devam (son 30 ders)" value={s.attendances.length ? `%${Math.round((present / s.attendances.length) * 100)}` : "—"} hint={`${present}/${s.attendances.length} ders`} />
        <Stat accent="gold" icon="wallet" label="Aylık aidat" value={tl(s.monthlyFee)} />
        <Stat accent="red" icon="alert" label="Açık bakiye" value={tl(debt)} tone={debt > 0 ? "red" : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Bilgiler">
          <ActionForm action={updateStudent}>
            <input type="hidden" name="id" value={s.id} />
            <StudentFields s={s} parents={parents} showActive />
            <div className="mt-5"><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          <Card title="Gruplar">
            {s.groups.length === 0 ? <Empty>Gruba kayıtlı değil. <Link className="link" href="/gruplar">Gruplar</Link> sayfasından ekleyin.</Empty> : (
              <ul className="divide-y divide-white/10 text-sm">
                {s.groups.map(({ group: g }) => (
                  <li key={g.id} className="flex justify-between py-2">
                    <Link className="link" href={`/gruplar/${g.id}`}>{g.name}</Link>
                    <span className="text-white/65">{DAY_LABEL[g.dayOfWeek]} {g.startTime}–{g.endTime} · {g.coach?.name ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Aidat geçmişi" padded={false}>
            {s.payments.length === 0 ? <Empty>Kayıt yok.</Empty> : (
              <TableWrap>
                <table className="table">
                  <thead><tr><th>Dönem</th><th>Tutar</th><th>Ödenen</th><th>Durum</th></tr></thead>
                  <tbody>
                    {s.payments.map((p) => {
                      const st = paymentStatus(p);
                      return (
                        <tr key={p.id}>
                          <td>{periodLabel(p.period)}</td>
                          <td>{tl(p.amount)}</td>
                          <td className="text-xs">{tl(p.paidAmount)}{p.paidAt && <div className="text-white/65">{dateLabel(p.paidAt, false)} · {PAY_METHOD_LABEL[p.method ?? ""] ?? ""}</div>}</td>
                          <td><Badge tone={PAY_TONE[st]}>{PAY_STATUS_LABEL[st]}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
          <Card title="Yoklama geçmişi">
            {s.attendances.length === 0 ? <Empty>Kayıt yok.</Empty> : (
              <ul className="space-y-1 text-sm">
                {s.attendances.map((a) => (
                  <li key={a.lessonId} className="flex justify-between">
                    <span>{dateLabel(a.lesson.date)} <span className="text-xs text-white/65">· {a.lesson.group.name}</span></span>
                    <Badge tone={ATT_TONE[a.status]}>{ATTENDANCE_LABEL[a.status]}</Badge>
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
