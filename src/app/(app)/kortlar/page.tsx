import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, dateLabel, dayOfWeek, isValidDate, overlaps, todayStr } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { OPEN_FROM, OPEN_UNTIL, RES_STATUS_LABEL, RES_TYPE_LABEL, SURFACE_LABEL } from "@/lib/labels";
import { approveReservation, cancelReservation, createCourt, createReservation, toggleCourt } from "@/app/actions/reservations";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";

const HOURS = Array.from({ length: Number(OPEN_UNTIL.slice(0, 2)) - Number(OPEN_FROM.slice(0, 2)) }, (_, i) =>
  String(Number(OPEN_FROM.slice(0, 2)) + i).padStart(2, "0"),
);

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ tarih?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayStr();
  const date = isValidDate(sp.tarih) ? sp.tarih : today;
  const isAdmin = user.role === "ADMIN";

  const [courts, allCourts, groups, reservations, coaches, myKids] = await Promise.all([
    db.court.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    isAdmin ? db.court.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.group.findMany({ where: { active: true, dayOfWeek: dayOfWeek(date), courtId: { not: null } }, include: { coach: true } }),
    db.reservation.findMany({
      where: { date, status: { not: "IPTAL" } },
      include: { court: true, user: true, coach: true, student: true },
      orderBy: { startTime: "asc" },
    }),
    db.user.findMany({ where: { role: "COACH", active: true }, orderBy: { name: "asc" } }),
    user.role === "PARENT"
      ? db.student.findMany({ where: { parentId: user.id, active: true }, orderBy: { firstName: "asc" } })
      : isAdmin ? db.student.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }) : Promise.resolve([]),
  ]);

  // Velinin başkalarının rezervasyon detayını görmemesi için hücrede sadece "Dolu" yazılır
  const canSeeDetails = (r: (typeof reservations)[number]) => user.role !== "PARENT" || r.userId === user.id;

  function cell(courtId: string, h: string) {
    const s = `${h}:00`, e = `${String(Number(h) + 1).padStart(2, "0")}:00`;
    const g = groups.find((g) => g.courtId === courtId && overlaps(g.startTime, g.endTime, s, e));
    if (g) return <div className="h-full rounded bg-emerald-400/20 px-1.5 py-1 text-[11px] text-lime-200">{user.role === "PARENT" ? "Grup dersi" : g.name}</div>;
    const r = reservations.find((r) => r.courtId === courtId && overlaps(r.startTime, r.endTime, s, e));
    if (r) {
      const tone = r.status === "BEKLEMEDE" ? "bg-amber-400/20 text-amber-200" : r.type === "OZEL_DERS" ? "bg-orange-400/20 text-orange-200" : "bg-sky-400/20 text-sky-100";
      return (
        <div className={`h-full rounded px-1.5 py-1 text-[11px] ${tone}`}>
          {canSeeDetails(r) ? (r.type === "OZEL_DERS" ? `Özel · ${r.coach?.name ?? ""}` : r.user.name) : "Dolu"}
          <span className="block opacity-70">{r.startTime}–{r.endTime}</span>
        </div>
      );
    }
    return <div className="h-full rounded border border-dashed border-white/15 px-1.5 py-1 text-[11px] text-white/60">Boş</div>;
  }

  const visibleRes = user.role === "PARENT" ? reservations.filter((r) => r.userId === user.id) : reservations;

  return (
    <>
      <PageHeader
        title="Kort rezervasyonu"
        subtitle={dateLabel(date)}
        actions={
          <form className="flex gap-2">
            <Link href={`/kortlar?tarih=${addDays(date, -1)}`} className="btn-secondary">←</Link>
            <input type="date" name="tarih" defaultValue={date} className="input w-auto" />
            <button className="btn-secondary">Git</button>
            <Link href={`/kortlar?tarih=${addDays(date, 1)}`} className="btn-secondary">→</Link>
          </form>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Doluluk" className="xl:col-span-2" padded={false}>
          {courts.length === 0 ? <Empty>Aktif kort yok.</Empty> : (
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[480px] table-fixed border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="w-14" style={{ width: 56 }} />
                    {courts.map((c) => (
                      <th key={c.id} className="text-left text-xs font-semibold text-white/75">
                        {c.name}<div className="font-normal text-white/60">{SURFACE_LABEL[c.surface]}{c.indoor ? " · Kapalı" : ""}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((h) => (
                    <tr key={h}>
                      <td className="pr-1 text-right align-top font-mono text-xs text-white/65">{h}:00</td>
                      {courts.map((c) => <td key={c.id} className="h-10 align-top">{cell(c.id, h)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={user.role === "PARENT" ? "Rezervasyon talebi" : "Yeni rezervasyon"}>
            <ActionForm action={createReservation} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="date" value={date} />
              <Field label="Kort">
                <select name="courtId" required className="input">
                  {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç"><input name="startTime" type="time" step={1800} min={OPEN_FROM} max={OPEN_UNTIL} defaultValue="18:00" required className="input" /></Field>
                <Field label="Bitiş"><input name="endTime" type="time" step={1800} min={OPEN_FROM} max={OPEN_UNTIL} defaultValue="19:00" required className="input" /></Field>
              </div>
              {user.role !== "COACH" && (
                <Field label="Tür">
                  <select name="type" className="input">
                    <option value="KIRALAMA">Kort kiralama</option>
                    <option value="OZEL_DERS">Özel ders</option>
                  </select>
                </Field>
              )}
              {user.role !== "COACH" && (
                <Field label={user.role === "PARENT" ? "Antrenör tercihi (özel ders için)" : "Antrenör (özel ders için)"}>
                  <select name="coachId" className="input">
                    <option value="">—</option>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              )}
              {myKids.length > 0 && (
                <Field label="Öğrenci">
                  <select name="studentId" className="input">
                    <option value="">—</option>
                    {myKids.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Not"><input name="note" className="input" placeholder={user.role === "PARENT" ? "ör. 2 kişi oynayacağız" : ""} /></Field>
              <SubmitButton>{user.role === "PARENT" ? "Talep gönder" : "Rezervasyon yap"}</SubmitButton>
              {user.role === "PARENT" && <p className="text-xs text-white/65">Talepler akademi onayından sonra kesinleşir.</p>}
            </ActionForm>
          </Card>

          <Card title={user.role === "PARENT" ? "Bu günkü rezervasyonlarım" : "Günün rezervasyonları"}>
            {visibleRes.length === 0 ? <Empty>Rezervasyon yok.</Empty> : (
              <ul className="divide-y divide-white/10">
                {visibleRes.map((r) => {
                  const canCancel = isAdmin || r.userId === user.id || r.coachId === user.id;
                  return (
                    <li key={r.id} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{r.startTime}–{r.endTime} · {r.court.name}</span>
                        <Badge tone={r.status === "ONAYLI" ? "green" : "amber"}>{RES_STATUS_LABEL[r.status]}</Badge>
                      </div>
                      <div className="text-xs text-white/65">
                        {RES_TYPE_LABEL[r.type]} · {r.user.name}{r.coach ? ` · Antrenör: ${r.coach.name}` : ""}{r.student ? ` · ${fullName(r.student)}` : ""}
                      </div>
                      {r.note && <div className="text-xs italic text-white/65">“{r.note}”</div>}
                      {(canCancel || (isAdmin && r.status === "BEKLEMEDE")) && (
                        <div className="mt-1.5 flex gap-2">
                          {isAdmin && r.status === "BEKLEMEDE" && (
                            <form action={approveReservation}><input type="hidden" name="id" value={r.id} /><button className="btn-primary btn-sm">Onayla</button></form>
                          )}
                          {canCancel && (
                            <form action={cancelReservation}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Rezervasyon iptal edilsin mi?">İptal et</ConfirmButton></form>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {isAdmin && (
            <Card title="Kortlar">
              <ul className="mb-4 divide-y divide-white/10 text-sm">
                {allCourts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span className={c.active ? "" : "text-white/60 line-through"}>{c.name} <span className="text-xs text-white/65">· {SURFACE_LABEL[c.surface]}{c.indoor ? " · Kapalı" : ""}</span></span>
                    <form action={toggleCourt}><input type="hidden" name="id" value={c.id} /><button className="btn-secondary btn-sm">{c.active ? "Kapat" : "Aç"}</button></form>
                  </li>
                ))}
              </ul>
              <ActionForm action={createCourt} className="space-y-2 border-t border-white/10 pt-3" resetOnSuccess>
                <div className="flex gap-2">
                  <input name="name" placeholder="Kort adı" required className="input" />
                  <select name="surface" className="input w-auto"><option value="TOPRAK">Toprak</option><option value="SERT">Sert</option><option value="CIM">Çim</option></select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="indoor" className="h-4 w-4" /> Kapalı kort</label>
                  <SubmitButton className="btn-secondary btn-sm">Kort ekle</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
