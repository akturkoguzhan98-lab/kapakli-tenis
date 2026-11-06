import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DAY_LABEL, LEVEL_LABEL } from "@/lib/labels";
import { Badge, Card, Empty, PageHeader, TableWrap } from "@/components/ui";

export default async function GroupsPage() {
  await requireUser("ADMIN");
  const groups = await db.group.findMany({
    include: { coach: true, court: true, _count: { select: { members: true } } },
    orderBy: [{ active: "desc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return (
    <>
      <PageHeader title="Gruplar" subtitle="Haftalık tekrar eden grup dersleri" actions={<Link href="/gruplar/yeni" className="btn-primary">+ Yeni grup</Link>} />
      <Card padded={false}>
        {groups.length === 0 ? <Empty>Henüz grup yok.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead><tr><th>Grup</th><th>Gün / saat</th><th>Seviye</th><th>Antrenör</th><th>Kort</th><th>Doluluk</th></tr></thead>
              <tbody>
                {groups.map((g) => {
                  const full = g._count.members >= g.capacity;
                  return (
                    <tr key={g.id} className={g.active ? "hover:bg-white/5" : "opacity-60"}>
                      <td><Link href={`/gruplar/${g.id}`} className="link">{g.name}</Link>{!g.active && <span className="ml-2"><Badge>Pasif</Badge></span>}</td>
                      <td>{DAY_LABEL[g.dayOfWeek]} {g.startTime}–{g.endTime}</td>
                      <td>{LEVEL_LABEL[g.level]}</td>
                      <td>{g.coach?.name ?? "—"}</td>
                      <td>{g.court?.name ?? "—"}</td>
                      <td><Badge tone={full ? "clay" : "green"}>{g._count.members}/{g.capacity}</Badge></td>
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
