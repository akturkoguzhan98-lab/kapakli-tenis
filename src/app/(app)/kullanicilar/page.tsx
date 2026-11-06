import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullName } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { Badge, Card, Empty, PageHeader, TableWrap } from "@/components/ui";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  await requireUser("ADMIN");
  const { rol } = await searchParams;
  const users = await db.user.findMany({
    where: rol ? { role: rol } : {},
    include: { children: true, _count: { select: { coachGroups: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader title="Kullanıcılar" subtitle="Yönetici, antrenör ve veli hesapları" actions={<Link href="/kullanicilar/yeni" className="btn-primary">+ Yeni kullanıcı</Link>} />
      <div className="mb-3 flex gap-2">
        <Link href="/kullanicilar" className={!rol ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Tümü</Link>
        {Object.entries(ROLE_LABEL).map(([k, v]) => (
          <Link key={k} href={`/kullanicilar?rol=${k}`} className={rol === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{v}</Link>
        ))}
      </div>
      <Card padded={false}>
        {users.length === 0 ? <Empty>Kullanıcı yok.</Empty> : (
          <TableWrap>
            <table className="table">
              <thead><tr><th>Ad</th><th>Rol</th><th>E-posta</th><th>Telefon</th><th>Bağlantılar</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "hover:bg-white/5" : "opacity-60"}>
                    <td><Link href={`/kullanicilar/${u.id}`} className="link">{u.name}</Link>{!u.active && <span className="ml-2"><Badge>Pasif</Badge></span>}</td>
                    <td><Badge tone={u.role === "ADMIN" ? "clay" : u.role === "COACH" ? "green" : "blue"}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="text-xs">{u.email}</td>
                    <td className="text-xs">{u.phone ?? "—"}</td>
                    <td className="text-xs text-white/75">
                      {u.role === "PARENT" && (u.children.map(fullName).join(", ") || "Öğrenci bağlı değil")}
                      {u.role === "COACH" && `${u._count.coachGroups} grup`}
                    </td>
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
