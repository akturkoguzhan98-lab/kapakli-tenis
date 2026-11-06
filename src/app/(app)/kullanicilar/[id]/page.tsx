import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullName } from "@/lib/format";
import { DAY_LABEL } from "@/lib/labels";
import { updateUser } from "@/app/actions/users";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { UserFields } from "@/components/UserFields";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { children: true, coachGroups: { where: { active: true } } } });
  if (!u) notFound();
  return (
    <>
      <PageHeader title={u.name} actions={<Link href="/kullanicilar" className="btn-secondary">← Kullanıcılar</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Hesap bilgileri" className="lg:col-span-2">
          <ActionForm action={updateUser}>
            <input type="hidden" name="id" value={u.id} />
            <UserFields u={u} />
            <div className="mt-5"><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
        </Card>
        {u.role === "PARENT" && (
          <Card title="Bağlı öğrenciler">
            {u.children.length === 0 ? <p className="text-sm text-white/65">Yok. Öğrenci kaydında bu veliyi seçin.</p> : (
              <ul className="space-y-1 text-sm">{u.children.map((c) => <li key={c.id}><Link className="link" href={`/ogrenciler/${c.id}`}>{fullName(c)}</Link></li>)}</ul>
            )}
          </Card>
        )}
        {u.role === "COACH" && (
          <Card title="Grupları">
            {u.coachGroups.length === 0 ? <p className="text-sm text-white/65">Atanmış grup yok.</p> : (
              <ul className="space-y-1 text-sm">{u.coachGroups.map((g) => <li key={g.id}><Link className="link" href={`/gruplar/${g.id}`}>{g.name}</Link> <span className="text-xs text-white/65">{DAY_LABEL[g.dayOfWeek]} {g.startTime}</span></li>)}</ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
