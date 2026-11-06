import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { logout } from "@/app/actions/auth";
import { Nav, NavItem } from "@/components/Nav";
import { CourtScene } from "@/components/CourtScene";

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/", label: "Genel bakış", icon: "home" },
    { href: "/ogrenciler", label: "Öğrenciler", icon: "users" },
    { href: "/gruplar", label: "Gruplar", icon: "layers" },
    { href: "/program", label: "Program", icon: "calendar" },
    { href: "/yoklama", label: "Yoklama", icon: "check" },
    { href: "/kortlar", label: "Kortlar", icon: "court" },
    { href: "/aidatlar", label: "Aidatlar", icon: "wallet" },
    { href: "/bildirimler", label: "WhatsApp", icon: "chat" },
    { href: "/karne", label: "Karne", icon: "star" },
    { href: "/raporlar", label: "Ders saatleri", icon: "clock" },
    { href: "/kullanicilar", label: "Kullanıcılar", icon: "user" },
  ],
  COACH: [
    { href: "/", label: "Bugün", icon: "home" },
    { href: "/program", label: "Program", icon: "calendar" },
    { href: "/yoklama", label: "Yoklama", icon: "check" },
    { href: "/karne", label: "Karne", icon: "star" },
    { href: "/raporlar", label: "Ders saatlerim", icon: "clock" },
    { href: "/kortlar", label: "Kortlar", icon: "court" },
  ],
  PARENT: [
    { href: "/", label: "Çocuklarım", icon: "heart" },
    { href: "/program", label: "Ders programı", icon: "calendar" },
    { href: "/kortlar", label: "Kort rezervasyonu", icon: "court" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <CourtScene />
      <Nav items={NAV[user.role]} user={user.name} roleLabel={ROLE_LABEL[user.role]} logout={logout} />
      <main className="relative z-10 px-3 pb-10 pt-6 sm:px-5 lg:pt-8 print:p-0">
        <div className="mx-auto max-w-[1400px] lg:px-3">{children}</div>
      </main>
    </div>
  );
}
