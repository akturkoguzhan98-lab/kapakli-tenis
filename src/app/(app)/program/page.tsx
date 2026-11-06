import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, dateLabel, isValidDate, startOfWeek, todayStr } from "@/lib/dates";
import { daySchedule } from "@/lib/queries";
import { DAY_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/ui";

export default async function ProgramPage({ searchParams }: { searchParams: Promise<{ hafta?: string; tum?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayStr();
  const week = startOfWeek(isValidDate(sp.hafta) ? sp.hafta : today);
  const onlyMine = user.role === "COACH" && sp.tum !== "1";

  let filter: { coachId?: string; studentIds?: string[] } = {};
  if (onlyMine) filter = { coachId: user.id };
  if (user.role === "PARENT") {
    const kids = await db.student.findMany({ where: { parentId: user.id }, select: { id: true } });
    filter = { studentIds: kids.map((k) => k.id) };
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const schedules = await Promise.all(days.map((d) => daySchedule(d, filter)));
  const q = (w: string) => `/program?hafta=${w}${sp.tum === "1" ? "&tum=1" : ""}`;

  return (
    <>
      <PageHeader
        title={user.role === "PARENT" ? "Ders programı" : "Haftalık program"}
        subtitle={`${dateLabel(week, false)} – ${dateLabel(addDays(week, 6), false)}`}
        actions={
          <>
            {user.role === "COACH" && (
              <Link href={`/program?hafta=${week}${onlyMine ? "&tum=1" : ""}`} className="btn-secondary">
                {onlyMine ? "Tüm akademi" : "Sadece benim derslerim"}
              </Link>
            )}
            <Link href={q(addDays(week, -7))} className="btn-secondary">← Önceki</Link>
            <Link href={q(startOfWeek(today))} className="btn-secondary">Bu hafta</Link>
            <Link href={q(addDays(week, 7))} className="btn-secondary">Sonraki →</Link>
          </>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((d, i) => (
          <div key={d} className={`card flex flex-col ${d === today ? "ring-2 ring-lime-300/80" : ""}`}>
            <div className="border-b border-white/10 px-3 py-2">
              <div className="text-sm font-semibold">{DAY_LABEL[i + 1]}</div>
              <div className="text-xs text-white/65">{dateLabel(d, false)}</div>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {schedules[i].length === 0 && <div className="py-3 text-center text-xs text-white/60">—</div>}
              {schedules[i].map((it) => {
                const color = it.kind === "GROUP"
                  ? "border-lime-300 bg-lime-300/15"
                  : it.reservation?.status === "BEKLEMEDE"
                    ? "border-amber-500 bg-amber-400/15"
                    : it.reservation?.type === "OZEL_DERS" ? "border-clay-500 bg-orange-400/15" : "border-sky-500 bg-sky-400/15";
                const body = (
                  <div className={`rounded-md border-l-4 px-2 py-1.5 text-xs ${color}`}>
                    <div className="font-mono font-semibold">{it.start}–{it.end}</div>
                    <div className="font-medium text-white">{it.title}</div>
                    <div className="text-white/65">{[it.court, it.coach].filter(Boolean).join(" · ")}</div>
                  </div>
                );
                return user.role !== "PARENT" && it.groupId ? (
                  <Link key={it.key} href={`/yoklama/${it.groupId}?tarih=${d}`} className="block hover:opacity-80">{body}</Link>
                ) : <div key={it.key}>{body}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/75">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-court-500" /> Grup dersi</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-clay-500" /> Özel ders</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-sky-500" /> Kort kiralama</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-500" /> Onay bekliyor</span>
      </div>
    </>
  );
}
