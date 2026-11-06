import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEvaluate, canViewStudent } from "@/lib/access";
import { ageFrom, dateLabel } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/labels";
import { average, parseScores } from "@/lib/skills";
import { deleteEvaluation } from "@/app/actions/evaluations";
import { sendKarneNotice } from "@/app/actions/notifications";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/ActionForm";
import { Card, Empty, PageHeader } from "@/components/ui";
import { SkillChart } from "@/components/SkillChart";
import { PrintButton } from "@/components/PrintButton";
import { WaButton } from "@/components/WaButton";
import { whatsappApiStatus } from "@/lib/notify/providers";

export default async function KarnePage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ id?: string; yeni?: string }> }) {
  const user = await requireUser();
  const { studentId } = await params;
  const sp = await searchParams;
  if (!(await canViewStudent(user, studentId))) redirect("/");
  const s = await db.student.findUnique({
    where: { id: studentId },
    include: {
      parent: true,
      evaluations: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { coach: true } },
      attendances: { where: {}, select: { status: true } },
    },
  });
  if (!s) notFound();
  const evals = s.evaluations;
  const idx = Math.max(0, evals.findIndex((e) => e.id === sp.id));
  const e = evals[idx];
  const prev = evals[idx + 1];
  const editable = await canEvaluate(user, studentId);
  const api = !!whatsappApiStatus();
  const notice = (id: string) => api ? (
    <ActionForm action={sendKarneNotice}>
      <input type="hidden" name="evaluationId" value={id} />
      <SubmitButton className="btn-primary btn-sm">Veliye WhatsApp ile bildir</SubmitButton>
    </ActionForm>
  ) : <WaButton href={`/wa-gonder?kaynak=karne&id=${id}`} primary />;
  const age = ageFrom(s.birthDate);
  const attended = s.attendances.filter((a) => a.status === "GELDI").length;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={`Gelişim karnesi · ${fullName(s)}`}
          subtitle={`${age !== null ? `${age} yaş · ` : ""}${LEVEL_LABEL[s.level]} seviye`}
          actions={
            <>
              {user.role !== "PARENT" && <Link href="/karne" className="btn-secondary">← Liste</Link>}
              {e && <PrintButton />}
              {editable && <Link href={`/karne/${s.id}/yeni`} className="btn-primary">+ Yeni karne</Link>}
            </>
          }
        />
        {sp.yeni && e && editable && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lime-300/15 px-4 py-3 text-sm text-lime-100">
            <span>Karne kaydedildi. Veliye WhatsApp ile haber verilsin mi?</span>
            {notice(e.id)}
          </div>
        )}
      </div>

      {!e ? (
        <Card><Empty>Henüz karne hazırlanmadı.{editable && <> <Link href={`/karne/${s.id}/yeni`} className="link">İlk karneyi oluşturun.</Link></>}</Empty></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 print:block">
          <article className="card p-5 lg:col-span-2 print:border-0 print:shadow-none">
            {/* Yazdırma başlığı */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-lime-200">Kapaklı Tenis Akademi</div>
                <h2 className="mt-1 text-xl font-semibold">{fullName(s)}</h2>
                <p className="text-sm text-white/65">{e.term} gelişim karnesi · {dateLabel(e.date, false)}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-xs text-white/65">Genel ortalama</div>
                <div className="text-2xl font-semibold tabular-nums">{average(parseScores(e.scores))?.toFixed(1).replace(".", ",")}<span className="text-sm text-white/60">/5</span></div>
                <div className="text-xs text-white/65">Antrenör: {e.coach?.name ?? "—"}</div>
              </div>
            </header>
            <SkillChart current={parseScores(e.scores)} previous={prev ? parseScores(prev.scores) : undefined} previousLabel={prev?.term} />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[["Güçlü yönleri", e.strengths], ["Geliştirmesi gerekenler", e.improve], ["Sonraki dönem hedefleri", e.goals]].map(([t, v]) => (
                <div key={t} className="rounded-lg bg-white/5 p-3 print:border print:border-stone-200 print:bg-white">
                  <div className="mb-1 text-xs font-semibold text-white/75">{t}</div>
                  <p className="whitespace-pre-line text-sm text-white">{v || "—"}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/65">Toplam katıldığı ders: {attended} · Puanlama: 1 Gelişmeli · 2 Temel · 3 İyi · 4 Çok iyi · 5 Mükemmel</p>
          </article>

          <div className="space-y-6 print:hidden">
            <Card title={`Tüm karneler (${evals.length})`}>
              <ul className="divide-y divide-white/10 text-sm">
                {evals.map((x) => (
                  <li key={x.id} className="flex items-center justify-between py-2">
                    <Link href={`/karne/${s.id}?id=${x.id}`} className={x.id === e.id ? "font-semibold text-white" : "link"}>{x.term}</Link>
                    <span className="text-xs text-white/65">{dateLabel(x.date, false)} · {average(parseScores(x.scores))?.toFixed(1).replace(".", ",")}</span>
                  </li>
                ))}
              </ul>
            </Card>
            {editable && !sp.yeni && (
              <Card title="İşlemler">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-sm"><span>Veliye karne bildirimi</span>{notice(e.id)}</div>
                  {(user.role === "ADMIN" || e.coachId === user.id) && (
                    <form action={deleteEvaluation}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton message="Bu karne silinsin mi?" className="btn-danger w-full">Karneyi sil</ConfirmButton>
                    </form>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
