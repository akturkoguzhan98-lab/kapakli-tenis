import { requireUser } from "@/lib/auth";
import { changePassword } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, PageHeader } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/labels";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Hesabım" subtitle={`${user.name} · ${user.email} · ${ROLE_LABEL[user.role]}`} />
      <Card title="Şifre değiştir" className="max-w-md">
        <ActionForm action={changePassword} className="space-y-3" resetOnSuccess>
          <Field label="Mevcut şifre"><input name="current" type="password" required className="input" autoComplete="current-password" /></Field>
          <Field label="Yeni şifre (en az 8 karakter)"><input name="next" type="password" required minLength={8} className="input" autoComplete="new-password" /></Field>
          <SubmitButton>Şifreyi değiştir</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
