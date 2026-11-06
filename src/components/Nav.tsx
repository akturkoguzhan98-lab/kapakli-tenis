"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, IconName } from "./icons";

/** secondary: üst menü yerine sağdaki hesap menüsünde gösterilir (seyrek kullanılan sayfalar) */
export type NavItem = { href: string; label: string; icon: IconName; secondary?: boolean };

/**
 * Üstte cam görünümlü hap menü.
 * - Geniş ekranda (≥1280px) tek satır; daha dar ekranda menü ikinci satırda yana kaydırılır.
 * - Kaydırılacak düğme varsa o kenarda yumuşak bir solma görünür.
 */
export function Nav({ items, user, roleLabel, logout }: {
  items: NavItem[]; user: string; roleLabel: string; logout: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [fade, setFade] = useState({ left: false, right: false });
  const menuRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = user.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr");
  const primary = items.filter((i) => !i.secondary);
  const secondary = items.filter((i) => i.secondary);
  const secondaryActive = secondary.some((i) => isActive(i.href));

  const updateFade = useCallback(() => {
    const el = pillsRef.current;
    if (!el) return;
    setFade({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  // Açık sayfanın düğmesi her zaman görünür olsun (dar ekranda kaydırılmış menü)
  useEffect(() => {
    pillsRef.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
    setOpen(false);
    updateFade();
  }, [path, updateFade]);

  useEffect(() => {
    window.addEventListener("resize", updateFade);
    return () => window.removeEventListener("resize", updateFade);
  }, [updateFade]);

  // Hesap menüsünü dışarı tıklayınca ya da Esc ile kapat
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const mask = fade.left && fade.right
    ? "linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent)"
    : fade.right ? "linear-gradient(to right, #000 calc(100% - 28px), transparent)"
    : fade.left ? "linear-gradient(to right, transparent, #000 28px)" : undefined;

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-[#03080c] via-[#03080c]/70 to-transparent px-3 pb-1 pt-3 sm:px-5 print:hidden">
      <div className="glass mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 rounded-3xl bg-[#08140f]/60 px-3 py-2 xl:flex-nowrap xl:rounded-full">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 pr-2 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full" />
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Kapaklı Tenis</span>
            <span className="block text-[11px] text-white/70">Akademi</span>
          </span>
        </Link>

        <nav
          ref={pillsRef}
          onScroll={updateFade}
          aria-label="Ana menü"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] xl:order-none xl:mx-auto xl:w-auto xl:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {primary.map((i) => {
            const active = isActive(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "border-white/35 bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
                    : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={i.icon} size={15} />
                {i.label}
              </Link>
            );
          })}
        </nav>

        <div ref={menuRef} className="relative ml-auto shrink-0 xl:ml-0">
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Hesap menüsü"
            className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs font-bold text-orange-950 ring-2 ${
              secondaryActive ? "ring-white" : "ring-white/30"
            }`}
          >
            {initials}
          </button>
          {open && (
            <div role="menu" className="card absolute right-0 top-11 w-60 !bg-[#0c1c17]/95 p-2 text-sm shadow-2xl">
              <div className="px-2 pb-2 pt-1">
                <div className="font-semibold text-white">{user}</div>
                <div className="text-xs text-white/65">{roleLabel}</div>
              </div>
              {secondary.length > 0 && (
                <div className="mb-1 border-y border-white/10 py-1">
                  {secondary.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      role="menuitem"
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 ${isActive(i.href) ? "bg-white/15 text-white" : "text-white/90"}`}
                    >
                      <Icon name={i.icon} size={15} /> {i.label}
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/profil" role="menuitem" className="block rounded-lg px-2 py-1.5 text-white/90 hover:bg-white/10">Şifre değiştir</Link>
              <form action={logout}>
                <button role="menuitem" className="w-full rounded-lg px-2 py-1.5 text-left text-red-300 hover:bg-red-500/15">Çıkış yap</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
