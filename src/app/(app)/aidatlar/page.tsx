import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMonths, currentPeriod, dateLabel, isValidPeriod, periodLabel, todayStr } from "@/lib/dates";
import { fullName, tl } from "@/lib/format";
import { PAY_METHOD_LABEL } from "@/lib/labels";
import { PAY_STATUS_LABEL, PayStatus, paymentStatus } from "@/lib/payments";
import { waLink } from "@/lib/phone";
import { deletePayment, generateDues, recordPayment, resetPayment } from "@/app/actions/payments";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, PageHeader, Stat, TableWrap } from "@/components/ui";

const PAY_TONE = { ODENDI: "green", KISMI: "amber", BEKLIYOR: "gray", GECIKTI: "red" } as const;

export default async function DuesPage({ searchParams }: { searchParams: Promise<{ donem?: string; durum?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const overdueMode = sp.durum === "GECIKTI";
  const period = isValidPeriod(sp.donem) ? sp.donem : currentPeriod();

  // Gecikenler görünümünde tüm dönemlerin gecikmiş aidatları listelenir
  const all = await db.payment.findMany({
    where: overdueMode ? { dueDate: { lt: todayStr() } } : { period },
    include: { student: { include: { parent: true } } },
    orderBy: [{ period: "desc" }, { student: { firstName: "asc" } }],
  });
  const rows = all
    .map((p) => ({ ...p, status: paymentStatus(p) }))
    .filter((p) => (sp.durum ? p.status === sp.durum : true));

  const expected = all.reduce((s, p) => s + p.amount, 0);
  const collected = all.reduce((s, p) => s + p.paidAmount, 0);
  const late = all.filter((p) => paymentStatus(p) === "GECIKTI");
  const statusLink = (d?: PayStatus) => `/aidatlar?donem=${period}${d ? `&durum=${d}` : ""}`;

  return (
    <>
      <PageHeader
        title="Aidatlar"
        subtitle={overdueMode ? "Tüm dönemlerdeki geciken ödemeler" : periodLabel(period)}
        actions={
          <>
            <Link href={`/aidatlar?donem=${addMonths(period, -1)}`} className="btn-secondary">← {periodLabel(addMonths(period, -1))}</Link>
            <Link href={`/aidatlar?donem=${addMonths(period, 1)}`} className="btn-secondary">{periodLabel(addMonths(period, 1))} →</Link>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent="blue" icon="wallet" label="Beklenen" value={tl(expected)} hint={`${all.length} kayıt`} />
        <Stat accent="green" icon="trend" label="Tahsil edilen" value={tl(collected)} progress={expected ? collected / expected : 0} hint={expected ? `%${Math.round((collected / expected) * 100)}` : undefined} />
        <Stat accent="gold" icon="clock" label="Kalan" value={tl(expected - collected)} />
        <Stat accent="red" icon="alert" label="Geciken" value={late.length} hint={tl(late.reduce((s, p) => s + p.amount - p.paidAmount, 0))} tone={late.length ? "red" : undefined} />
      </div>

      {!overdueMode && (
        <Card className="mb-6">
          <ActionForm action={generateDues} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="period" value={period} />
            <div className="flex-1 text-sm text-white/75">
              <b>{periodLabel(period)}</b> dönemi için aidat ücreti tanımlı tüm aktif öğrencilere borç kaydı oluşturur. Mevcut kayıtlara dokunmaz.
            </div>
            <label className="text-sm">
              <span className="label">Son ödeme günü</span>
              <input name="dueDay" type="number" min={1} max={28} defaultValue={10} className="input w-24" />
            </label>
            <SubmitButton>Aidatları oluştur</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link href={statusLink()} className={!sp.durum ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Tümü</Link>
        {(Object.keys(PAY_STATUS_LABEL) as PayStatus[]).map((d) => (
          <Link key={d} href={statusLink(d)} className={sp.durum === d ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{PAY_STATUS_LABEL[d]}</Link>
        ))}
      </div>

      <Card padded={false}>
        {rows.length === 0 ? <Empty>Kayıt yok{!overdueMode && all.length === 0 ? " — yukarıdan bu dönemin aidatlarını oluşturun" : ""}.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr><th>Öğrenci</th>{overdueMode && <th>Dönem</th>}<th>Son ödeme</th><th>Tutar</th><th>Ödenen</th><th>Durum</th><th>Tahsilat</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const remaining = p.amount - p.paidAmount;
                  return (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td>
                        <Link href={`/ogrenciler/${p.studentId}`} className="link">{fullName(p.student)}</Link>
                        {p.student.parent && <div className="text-xs text-white/65">{p.student.parent.name}{p.student.parent.phone ? ` · ${p.student.parent.phone}` : ""}</div>}
                        {remaining > 0 && (() => {
                          const url = waLink(p.student.parent?.phone ?? p.student.phone,
                            `Sayın ${p.student.parent?.name ?? fullName(p.student)}, ${fullName(p.student)} için ${periodLabel(p.period)} aidatından ${tl(remaining)} ödeme beklenmektedir. Kapaklı Tenis Akademi`);
                          return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-lime-200 hover:underline">WhatsApp ile hatırlat ↗</a> : null;
                        })()}
                      </td>
                      {overdueMode && <td>{periodLabel(p.period)}</td>}
                      <td className="whitespace-nowrap text-xs">{dateLabel(p.dueDate, false)}</td>
                      <td>{tl(p.amount)}</td>
                      <td className="text-xs">
                        {tl(p.paidAmount)}
                        {p.paidAt && <div className="text-white/65">{dateLabel(p.paidAt, false)} · {PAY_METHOD_LABEL[p.method ?? ""]}</div>}
                      </td>
                      <td><Badge tone={PAY_TONE[p.status]}>{PAY_STATUS_LABEL[p.status]}</Badge></td>
                      <td>
                        {remaining > 0 ? (
                          <ActionForm action={recordPayment} className="flex flex-wrap items-center gap-1.5">
                            <input type="hidden" name="id" value={p.id} />
                            <input name="amount" type="number" min={1} max={remaining} defaultValue={remaining} className="input w-24 py-1" aria-label="Tutar" />
                            <select name="method" className="input w-auto py-1" aria-label="Yöntem">
                              {Object.entries(PAY_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <SubmitButton className="btn-primary btn-sm">Tahsil et</SubmitButton>
                          </ActionForm>
                        ) : (
                          <form action={resetPayment}>
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton message="Tahsilat geri alınsın mı?" className="btn-secondary btn-sm">Geri al</ConfirmButton>
                          </form>
                        )}
                        {p.paidAmount === 0 && (
                          <form action={deletePayment} className="mt-1">
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton message="Bu aidat kaydı silinsin mi?" className="text-xs text-red-300 hover:underline">Kaydı sil</ConfirmButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
