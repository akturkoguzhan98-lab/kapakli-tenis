import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { login } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { TennisBackground } from "@/components/TennisBackground";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giriş · Kapaklı Tenis Akademi" };

export default async function LoginPage() {
  // Hiç kullanıcı yoksa (yeni kurulum) ilk yönetici hesabı sayfasına git
  if ((await db.user.count()) === 0) redirect("/kurulum");
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-court-900 px-4 py-10">
      <TennisBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="tb-rise mb-6 text-center text-white [text-shadow:0_2px_12px_rgba(0,0,0,.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Kapaklı Tenis Akademi logosu"
            width={128}
            height={128}
            className="mx-auto h-28 w-28 rounded-full shadow-xl ring-4 ring-white/20 sm:h-32 sm:w-32"
          />
          <h1 className="mt-4 text-2xl font-semibold">Kapaklı Tenis Akademi</h1>
          <p className="text-sm text-court-100">Yönetim paneline giriş</p>
        </div>
        <div className="tb-rise-2 card p-6 shadow-2xl">
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
        <p className="tb-rise-2 mt-4 text-center text-xs text-court-100">Hesabınız yoksa akademi yönetimiyle iletişime geçin.</p>
      </div>
    </div>
  );
}
