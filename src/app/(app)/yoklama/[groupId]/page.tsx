import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, dateLabel, dayOfWeek, isValidDate, todayStr } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { ATTENDANCE_LABEL, DAY_LABEL } from "@/lib/labels";
import { saveAttendance } from "@/app/actions/attendance";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Empty, PageHeader } from "@/components/ui";

/** Verilen tarihten geriye doğru grubun ders günü olan en yakın tarih */
function lastLessonDay(date: string, dow: number) {
  let d = date;
  while (dayOfWeek(d) !== dow) d = addDays(d, -1);
  return d;
}

export default async function TakeAttendance({ params, searchParams }: {
  params: Promise<{ groupId: string }>; searchParams: Promise<{ tarih?: string }>;
}) {
  const user = await requireUser("ADMIN", "COACH");
  const { groupId } = await params;
  const sp = await searchParams;
  const g = await db.group.findUnique({
    where: { id: groupId },
    include: { coach: true, court: true, members: { where: { student: { active: true } }, include: { student: true }, orderBy: { student: { firstName: "asc" } } } },
  });
  if (!g) notFound();
  if (user.role === "COACH" && g.coachId !== user.id) redirect("/yoklama");

  const today = todayStr();
  const requested = isValidDate(sp.tarih) ? sp.tarih : today;
  const date = lastLessonDay(requested > today ? today : requested, g.dayOfWeek);
  const lesson = await db.lesson.findUnique({ where: { groupId_date: { groupId, date } }, include: { attendances: true, takenBy: true } });
  const prev = new Map(lesson?.attendances.map((a) => [a.studentId, a.status]));
  const nextDate = addDays(date, 7);

  return (
    <>
      <PageHeader
        title={`Yoklama · ${g.name}`}
        subtitle={`${dateLabel(date)} · ${g.startTime}–${g.endTime} · ${g.court?.name ?? "Kort yok"} · ${g.coach?.name ?? "Antrenör yok"}`}
        actions={
          <>
            <Link href={`/yoklama/${g.id}?tarih=${addDays(date, -7)}`} className="btn-secondary">← Önceki ders</Link>
            {nextDate <= today && <Link href={`/yoklama/${g.id}?tarih=${nextDate}`} className="btn-secondary">Sonraki ders →</Link>}
          </>
        }
      />
      {requested !== date && (
        <p className="mb-4 rounded-lg bg-amber-400/15 px-3 py-2 text-sm text-amber-200">
          Bu grubun dersi {DAY_LABEL[g.dayOfWeek]} günleri; en yakın geçmiş ders ({dateLabel(date)}) gösteriliyor.
        </p>
      )}
      <Card className="max-w-2xl" title={lesson ? `Kaydedildi${lesson.takenBy ? ` · ${lesson.takenBy.name}` : ""}` : "Yoklama alınmadı"}>
        {g.members.length === 0 ? <Empty>Grupta öğrenci yok.</Empty> : (
          <ActionForm action={saveAttendance}>
            <input type="hidden" name="groupId" value={g.id} />
            <input type="hidden" name="date" value={date} />
            <ul className="divide-y divide-white/10">
              {g.members.map(({ student: s }) => {
                const cur = prev.get(s.id) ?? "GELDI";
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="text-sm font-medium">{fullName(s)}</span>
                    <div className="flex overflow-hidden rounded-lg border border-white/25 text-sm">
                      {(["GELDI", "GELMEDI", "IZINLI"] as const).map((st) => (
                        <label key={st} className="cursor-pointer">
                          <input type="radio" name={`s_${s.id}`} value={st} defaultChecked={cur === st} className="peer sr-only" />
                          <span className={`block px-3 py-1.5 transition peer-checked:text-white ${
                            st === "GELDI" ? "peer-checked:bg-court-600" : st === "GELMEDI" ? "peer-checked:bg-red-600" : "peer-checked:bg-amber-500"
                          } peer-focus-visible:ring-2`}>
                            {ATTENDANCE_LABEL[st]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="mt-4 block">
              <span className="label">Ders notu (işlenen konu, gözlemler)</span>
              <textarea name="note" rows={2} defaultValue={lesson?.note ?? ""} className="input" />
            </label>
            <div className="mt-4"><SubmitButton>Yoklamayı kaydet</SubmitButton></div>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
