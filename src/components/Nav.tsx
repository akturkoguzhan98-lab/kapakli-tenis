"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, IconName } from "./icons";

export type NavItem = { href: string; label: string; icon: IconName };

/** Üstte cam görünümlü hap menü. Telefonda menü ikinci satırda yana kaydırılır. */
export function Nav({ items, user, roleLabel, logout }: {
  items: NavItem[]; user: string; roleLabel: string; logout: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = user.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr");

  // Açık sayfanın düğmesi her zaman görünür olsun (telefonda kaydırılmış menü)
  useEffect(() => {
    pillsRef.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
    setOpen(false);
  }, [path]);

  // Hesap menüsünü dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 print:hidden">
      <div className="glass mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 rounded-3xl bg-[#08140f]/60 px-3 py-2 lg:flex-nowrap lg:rounded-full">
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
          className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:order-none lg:mx-auto lg:w-auto lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((i) => {
            const active = isActive(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                data-active={active}
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

        <div ref={menuRef} className="relative ml-auto shrink-0 lg:ml-0">
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Hesap menüsü"
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs font-bold text-orange-950 ring-2 ring-white/30"
          >
            {initials}
          </button>
          {open && (
            <div className="card absolute right-0 top-11 w-56 p-3 text-sm">
              <div className="font-semibold text-white">{user}</div>
              <div className="mb-3 text-xs text-white/65">{roleLabel}</div>
              <Link href="/profil" className="block rounded-lg px-2 py-1.5 text-white/90 hover:bg-white/10">Şifre değiştir</Link>
              <form action={logout}>
                <button className="w-full rounded-lg px-2 py-1.5 text-left text-red-300 hover:bg-red-500/15">Çıkış yap</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
