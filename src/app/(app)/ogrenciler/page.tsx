import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ageFrom } from "@/lib/dates";
import { fullName, tl } from "@/lib/format";
import { LEVELS, LEVEL_LABEL } from "@/lib/labels";
import { Badge, Card, Empty, PageHeader, TableWrap } from "@/components/ui";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; seviye?: string; durum?: string }> }) {
  await requireUser("ADMIN");
  const { q = "", seviye = "", durum = "aktif" } = await searchParams;
  const students = await db.student.findMany({
    where: {
      ...(durum === "aktif" ? { active: true } : durum === "pasif" ? { active: false } : {}),
      ...(seviye ? { level: seviye } : {}),
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { parent: { name: { contains: q } } }] } : {}),
    },
    include: { parent: true, groups: { include: { group: true } } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <>
      <PageHeader title="Öğrenciler" subtitle={`${students.length} kayıt`} actions={<Link href="/ogrenciler/yeni" className="btn-primary">+ Yeni öğrenci</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Ad, soyad veya veli ara…" className="input max-w-xs" />
        <select name="seviye" defaultValue={seviye} className="input w-auto">
          <option value="">Tüm seviyeler</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        <select name="durum" defaultValue={durum} className="input w-auto">
          <option value="aktif">Aktif</option><option value="pasif">Pasif</option><option value="tum">Tümü</option>
        </select>
        <button className="btn-secondary">Filtrele</button>
      </form>
      <Card padded={false}>
        {students.length === 0 ? <Empty>Öğrenci bulunamadı.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead><tr><th>Öğrenci</th><th>Yaş</th><th>Seviye</th><th>Gruplar</th><th>Veli</th><th className="text-right">Aidat</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td>
                      <Link href={`/ogrenciler/${s.id}`} className="link">{fullName(s)}</Link>
                      {!s.active && <span className="ml-2"><Badge>Pasif</Badge></span>}
                    </td>
                    <td>{ageFrom(s.birthDate) ?? "—"}</td>
                    <td>{LEVEL_LABEL[s.level]}</td>
                    <td className="text-xs text-white/75">{s.groups.map((g) => g.group.name).join(", ") || "—"}</td>
                    <td className="text-xs">{s.parent ? <>{s.parent.name}<div className="text-white/65">{s.parent.phone}</div></> : "—"}</td>
                    <td className="text-right">{s.monthlyFee ? tl(s.monthlyFee) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
