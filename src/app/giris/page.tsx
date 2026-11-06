import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { login } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giriş · Kapaklı Tenis Akademi" };

export default async function LoginPage() {
  // Hiç kullanıcı yoksa (yeni kurulum) ilk yönetici hesabı sayfasına git
  if ((await db.user.count()) === 0) redirect("/kurulum");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-court-900 via-court-700 to-clay-700 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <svg width="48" height="48" viewBox="0 0 32 32" className="mx-auto" aria-hidden>
            <circle cx="16" cy="16" r="14" fill="#d4e157" />
            <path d="M5 8c6 3 6 13 0 16M27 8c-6 3-6 13 0 16" stroke="#fff" strokeWidth="2" fill="none" />
          </svg>
          <h1 className="mt-3 text-2xl font-semibold">Kapaklı Tenis Akademi</h1>
          <p className="text-sm text-court-100">Yönetim paneline giriş</p>
        </div>
        <div className="card p-6">
          <ActionForm action={login} className="space-y-4">
            <label className="block">
              <span className="label">E-posta</span>
              <input name="email" type="email" required autoComplete="email" className="input" />
            </label>
            <label className="block">
              <span className="label">Şifre</span>
              <input name="password" type="password" required autoComplete="current-password" className="input" />
            </label>
            <SubmitButton className="btn-primary w-full">Giriş yap</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-xs text-court-100">Hesabınız yoksa akademi yönetimiyle iletişime geçin.</p>
      </div>
    </div>
  );
}
