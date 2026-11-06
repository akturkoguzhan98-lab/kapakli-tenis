import Link from "@/components/Link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGroup } from "@/app/actions/groups";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { GroupFields } from "@/components/GroupFields";

export default async function NewGroupPage() {
  await requireUser("ADMIN");
  const [coaches, courts] = await Promise.all([
    db.user.findMany({ where: { role: "COACH", active: true }, orderBy: { name: "asc" } }),
    db.court.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Yeni grup" actions={<Link href="/gruplar" className="btn-secondary">Vazgeç</Link>} />
      <Card className="max-w-2xl">
        <ActionForm action={createGroup}>
          <GroupFields coaches={coaches} courts={courts} />
          <div className="mt-5"><SubmitButton>Grubu oluştur</SubmitButton></div>
        </ActionForm>
      </Card>
    </>
  );
}
