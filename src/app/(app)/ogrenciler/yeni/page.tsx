import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStudent } from "@/app/actions/students";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { StudentFields } from "@/components/StudentFields";

export default async function NewStudentPage() {
  await requireUser("ADMIN");
  const parents = await db.user.findMany({ where: { role: "PARENT", active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Yeni öğrenci" actions={<Link href="/ogrenciler" className="btn-secondary">Vazgeç</Link>} />
      <Card className="max-w-3xl">
        <ActionForm action={createStudent}>
          <StudentFields parents={parents} />
          <div className="mt-5"><SubmitButton>Öğrenciyi kaydet</SubmitButton></div>
        </ActionForm>
      </Card>
    </>
  );
}
