import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createUser } from "@/app/actions/users";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { UserFields } from "@/components/UserFields";

export default async function NewUserPage() {
  await requireUser("ADMIN");
  return (
    <>
      <PageHeader title="Yeni kullanıcı" subtitle="Veli hesabı oluşturduktan sonra öğrenci kaydında veliyi seçebilirsiniz." actions={<Link href="/kullanicilar" className="btn-secondary">Vazgeç</Link>} />
      <Card className="max-w-2xl">
        <ActionForm action={createUser}>
          <UserFields isNew />
          <div className="mt-5"><SubmitButton>Kullanıcıyı oluştur</SubmitButton></div>
        </ActionForm>
      </Card>
    </>
  );
}
