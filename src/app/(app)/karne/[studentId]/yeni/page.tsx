import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEvaluate } from "@/lib/access";
import { todayStr } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { parseScores, SCORE_LABEL, SKILL_GROUPS, suggestTerm } from "@/lib/skills";
import { createEvaluation } from "@/app/actions/evaluations";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, PageHeader } from "@/components/ui";

export default async function NewKarnePage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requireUser("ADMIN", "COACH");
  const { studentId } = await params;
  if (!(await canEvaluate(user, studentId))) redirect("/karne");
  const s = await db.student.findUnique({ where: { id: studentId }, include: { evaluations: { orderBy: { date: "desc" }, take: 1 } } });
  if (!s) notFound();
  const last = s.evaluations[0];
  const lastScores = last ? parseScores(last.scores) : {};
  const coaches = user.role === "ADMIN" ? await db.user.findMany({ where: { role: "COACH", active: true }, orderBy: { name: "asc" } }) : [];
  const today = todayStr();

  return (
    <>
      <PageHeader
        title={`Yeni karne · ${fullName(s)}`}
        subtitle={last ? `Puanlar son karneden (${last.term}) getirildi; değişenleri güncelleyin.` : "İlk karne"}
        actions={<Link href={`/karne/${s.id}`} className="btn-secondary">Vazgeç</Link>}
      />
      <ActionForm action={createEvaluation} className="max-w-3xl space-y-6">
        <input type="hidden" name="studentId" value={s.id} />
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Dönem *"><input name="term" required defaultValue={suggestTerm(today)} className="input" /></Field>
            <Field label="Tarih"><input name="date" type="date" defaultValue={today} className="input" /></Field>
            {user.role === "ADMIN" && (
              <Field label="Antrenör">
                <select name="coachId" className="input" defaultValue={last?.coachId ?? ""}>
                  <option value="">—</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
          </div>
        </Card>
        {SKILL_GROUPS.map((g) => (
          <Card key={g.name} title={g.name}>
            <div className="space-y-3">
              {g.skills.map(([k, label]) => (
                <fieldset key={k} className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="sr-only">{label}</legend>
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="cursor-pointer" title={SCORE_LABEL[n]}>
                        <input type="radio" name={`skill_${k}`} value={n} defaultChecked={lastScores[k] === n} required className="peer sr-only" />
                        <span className="block min-w-[2.75rem] px-2 py-1.5 text-center transition peer-checked:bg-court-600 peer-checked:text-white peer-focus-visible:ring-2">
                          {n}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>
        ))}
        <p className="text-xs text-stone-500">1 Gelişmeli · 2 Temel · 3 İyi · 4 Çok iyi · 5 Mükemmel</p>
        <Card title="Antrenör değerlendirmesi">
          <div className="space-y-4">
            <Field label="Güçlü yönleri"><textarea name="strengths" rows={2} className="input" /></Field>
            <Field label="Geliştirmesi gerekenler"><textarea name="improve" rows={2} className="input" /></Field>
            <Field label="Sonraki dönem hedefleri"><textarea name="goals" rows={2} defaultValue="" className="input" /></Field>
          </div>
        </Card>
        <SubmitButton>Karneyi kaydet</SubmitButton>
      </ActionForm>
    </>
  );
}
