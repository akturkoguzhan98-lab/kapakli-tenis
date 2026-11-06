"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SidebarDecor } from "./TennisBackground";

export type NavItem = { href: string; label: string };

export function Nav({ items, user, roleLabel, logout }: {
  items: NavItem[]; user: string; roleLabel: string; logout: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const links = (
    <nav className="flex flex-col gap-0.5">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={() => setOpen(false)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(i.href) ? "bg-white/15 text-white" : "text-court-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 pt-4 text-sm">
      <div className="font-medium text-white">{user}</div>
      <div className="text-xs text-court-100">{roleLabel}</div>
      <div className="mt-3 flex gap-2">
        <Link href="/profil" onClick={() => setOpen(false)} className="text-xs text-court-100 hover:text-white">Şifre değiştir</Link>
        <span className="text-court-100/50">·</span>
        <form action={logout}>
          <button className="text-xs text-court-100 hover:text-white">Çıkış</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobil üst çubuk */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between bg-court-900 px-4 py-3 text-white lg:hidden">
        <Brand />
        <button onClick={() => setOpen(!open)} className="rounded-md px-2 py-1 text-sm ring-1 ring-white/20" aria-expanded={open}>
          {open ? "Kapat" : "Menü"}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[52px] bottom-0 z-20 flex flex-col justify-between overflow-y-auto bg-court-900 p-4 lg:hidden">
          <SidebarDecor />
          <div className="relative z-10">{links}</div>
          <div className="relative z-10">{footer}</div>
        </div>
      )}
      {/* Masaüstü yan menü */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 print:!hidden flex-col justify-between overflow-hidden bg-court-900 p-4 lg:flex">
        <SidebarDecor />
        <div className="relative z-10">
          <div className="mb-6 px-2 pt-1"><Brand /></div>
          {links}
        </div>
        <div className="relative z-10">{footer}</div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Kapaklı Tenis</span>
        <span className="block text-[11px] text-court-100">Akademi</span>
      </span>
    </Link>
  );
}
