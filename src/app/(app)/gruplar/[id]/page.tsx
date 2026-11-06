import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ageFrom, dateLabel } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { DAY_LABEL, LEVEL_LABEL } from "@/lib/labels";
import { addMember, removeMember, updateGroup } from "@/app/actions/groups";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/ActionForm";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { GroupFields } from "@/components/GroupFields";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const g = await db.group.findUnique({
    where: { id },
    include: {
      members: { include: { student: true }, orderBy: { student: { firstName: "asc" } } },
      lessons: { orderBy: { date: "desc" }, take: 8, include: { attendances: true } },
    },
  });
  if (!g) notFound();
  const activeCount = g.members.filter((m) => m.student.active).length;
  const [coaches, courts, candidates] = await Promise.all([
    db.user.findMany({ where: { role: "COACH", active: true }, orderBy: { name: "asc" } }),
    db.court.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.student.findMany({
      where: { active: true, groups: { none: { groupId: id } } },
      orderBy: [{ level: "asc" }, { firstName: "asc" }],
    }),
  ]);
  // Grubun seviyesindeki öğrenciler listede önce gelsin
  candidates.sort((a, b) => Number(b.level === g.level) - Number(a.level === g.level));

  return (
    <>
      <PageHeader
        title={g.name}
        subtitle={`${DAY_LABEL[g.dayOfWeek]} ${g.startTime}–${g.endTime} · ${LEVEL_LABEL[g.level]}`}
        actions={<Link href="/gruplar" className="btn-secondary">← Gruplar</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title={`Öğrenciler (${activeCount}/${g.capacity})`}>
            {g.members.length === 0 ? <Empty>Grupta öğrenci yok.</Empty> : (
              <ul className="divide-y divide-white/10">
                {g.members.map(({ student: s }) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <Link href={`/ogrenciler/${s.id}`} className="link">{fullName(s)}</Link>
                      <span className="ml-2 text-xs text-white/65">{ageFrom(s.birthDate) ?? "?"} yaş · {LEVEL_LABEL[s.level]}</span>
                      {!s.active && <span className="ml-2"><Badge>Pasif · sayılmıyor</Badge></span>}
                    </span>
                    <form action={removeMember}>
                      <input type="hidden" name="groupId" value={g.id} />
                      <input type="hidden" name="studentId" value={s.id} />
                      <ConfirmButton message={`${fullName(s)} gruptan çıkarılsın mı?`}>Çıkar</ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {activeCount < g.capacity && (
              <ActionForm action={addMember} className="mt-4 border-t border-white/10 pt-4">
                <input type="hidden" name="groupId" value={g.id} />
                <div className="flex gap-2">
                  <select name="studentId" className="input" defaultValue="">
                    <option value="" disabled>Öğrenci seçin…</option>
                    {candidates.map((s) => (
                      <option key={s.id} value={s.id}>{fullName(s)} · {LEVEL_LABEL[s.level]}{s.level === g.level ? " ✓" : ""}</option>
                    ))}
                  </select>
                  <SubmitButton className="btn-primary shrink-0">Ekle</SubmitButton>
                </div>
              </ActionForm>
            )}
          </Card>
          <Card title="Son dersler">
            {g.lessons.length === 0 ? <Empty>Henüz yoklama alınmadı.</Empty> : (
              <ul className="divide-y divide-white/10 text-sm">
                {g.lessons.map((l) => (
                  <li key={l.id} className="flex justify-between py-2">
                    <Link href={`/yoklama/${g.id}?tarih=${l.date}`} className="link">{dateLabel(l.date)}</Link>
                    <span className="text-white/65">{l.attendances.filter((a) => a.status === "GELDI").length}/{l.attendances.length} geldi</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Grup ayarları">
          <ActionForm action={updateGroup}>
            <input type="hidden" name="id" value={g.id} />
            <GroupFields g={g} coaches={coaches} courts={courts} showActive />
            <div className="mt-5"><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
