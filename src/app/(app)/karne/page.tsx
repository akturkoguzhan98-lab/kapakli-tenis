import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateLabel } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/labels";
import { average, parseScores } from "@/lib/skills";
import { Badge, Card, Empty, PageHeader, TableWrap } from "@/components/ui";

export default async function KarneIndex() {
  const user = await requireUser();
  if (user.role === "PARENT") redirect("/");
  const students = await db.student.findMany({
    where: { active: true, ...(user.role === "COACH" ? { groups: { some: { group: { coachId: user.id } } } } : {}) },
    include: {
      evaluations: { orderBy: { date: "desc" }, take: 1, include: { coach: true } },
      groups: { include: { group: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const without = students.filter((s) => s.evaluations.length === 0).length;

  return (
    <>
      <PageHeader
        title="Gelişim karnesi"
        subtitle={`${students.length} öğrenci${without ? ` · ${without} öğrencinin henüz karnesi yok` : ""}`}
      />
      <Card padded={false}>
        {students.length === 0 ? <Empty>{user.role === "COACH" ? "Gruplarınızda öğrenci yok." : "Öğrenci yok."}</Empty> : (
          <TableWrap>
            <table className="table">
              <thead><tr><th>Öğrenci</th><th>Seviye</th><th>Grup</th><th>Son karne</th><th className="text-right">Ortalama</th><th /></tr></thead>
              <tbody>
                {students.map((s) => {
                  const e = s.evaluations[0];
                  const avg = e ? average(parseScores(e.scores)) : null;
                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td><Link href={`/karne/${s.id}`} className="link">{fullName(s)}</Link></td>
                      <td>{LEVEL_LABEL[s.level]}</td>
                      <td className="text-xs text-white/75">{s.groups.map((g) => g.group.name).join(", ") || "—"}</td>
                      <td className="text-xs">{e ? <>{e.term}<div className="text-white/65">{dateLabel(e.date, false)}{e.coach ? ` · ${e.coach.name}` : ""}</div></> : <Badge tone="amber">Yok</Badge>}</td>
                      <td className="text-right tabular-nums">{avg ? avg.toFixed(1).replace(".", ",") : "—"}</td>
                      <td className="text-right"><Link href={`/karne/${s.id}/yeni`} className="btn-secondary btn-sm">+ Karne</Link></td>
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
