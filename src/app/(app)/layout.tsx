import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { logout } from "@/app/actions/auth";
import { Nav, NavItem } from "@/components/Nav";

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/", label: "Genel bakış" },
    { href: "/ogrenciler", label: "Öğrenciler" },
    { href: "/gruplar", label: "Gruplar" },
    { href: "/program", label: "Haftalık program" },
    { href: "/yoklama", label: "Yoklama" },
    { href: "/kortlar", label: "Kort rezervasyonu" },
    { href: "/aidatlar", label: "Aidatlar" },
    { href: "/bildirimler", label: "WhatsApp hatırlatma" },
    { href: "/karne", label: "Gelişim karnesi" },
    { href: "/raporlar", label: "Ders saati raporu" },
    { href: "/kullanicilar", label: "Kullanıcılar" },
  ],
  COACH: [
    { href: "/", label: "Bugün" },
    { href: "/program", label: "Haftalık program" },
    { href: "/yoklama", label: "Yoklama" },
    { href: "/karne", label: "Gelişim karnesi" },
    { href: "/raporlar", label: "Ders saatlerim" },
    { href: "/kortlar", label: "Kort rezervasyonu" },
  ],
  PARENT: [
    { href: "/", label: "Çocuklarım" },
    { href: "/program", label: "Ders programı" },
    { href: "/kortlar", label: "Kort rezervasyonu" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Nav items={NAV[user.role]} user={user.name} roleLabel={ROLE_LABEL[user.role]} logout={logout} />
      <main className="px-4 py-6 lg:ml-60 lg:px-8 lg:py-8 print:ml-0 print:p-0">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
