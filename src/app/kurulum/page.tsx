import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createFirstAdmin } from "@/app/actions/setup";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "İlk kurulum · Kapaklı Tenis Akademi" };

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/giris");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-court-900 via-court-700 to-clay-700 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <h1 className="text-2xl font-semibold">Hoş geldiniz 🎾</h1>
          <p className="mt-1 text-sm text-court-100">Kapaklı Tenis Akademi sistemi ilk kez açılıyor. Yönetici hesabınızı oluşturun.</p>
        </div>
        <div className="card p-6">
          <ActionForm action={createFirstAdmin} className="space-y-4">
            <label className="block"><span className="label">Ad soyad</span><input name="name" required className="input" /></label>
            <label className="block"><span className="label">E-posta</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
            <label className="block"><span className="label">Şifre (en az 8 karakter)</span><input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></label>
            <label className="block"><span className="label">Şifre (tekrar)</span><input name="password2" type="password" required minLength={8} autoComplete="new-password" className="input" /></label>
            <SubmitButton className="btn-primary w-full">Yönetici hesabını oluştur</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-xs text-court-100">Bu sayfa sadece bir kez, hiç kullanıcı yokken açılır.</p>
      </div>
    </div>
  );
}
