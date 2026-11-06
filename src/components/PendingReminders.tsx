"use client";

import { useEffect, useState } from "react";
import Link from "./Link";

/** Bekleyen WhatsApp hatırlatmaları bandı — sayılar sayfa açıldıktan sonra ayrı istekle gelir */
export function PendingReminders() {
  const [n, setN] = useState<{ dues: number; lessons: number } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/bekleyen", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.dues === "number") setN(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!n || n.dues + n.lessons === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-300/30 bg-lime-300/15 px-4 py-3 text-sm text-lime-100">
      <span>
        <b>Bekleyen WhatsApp hatırlatmaları:</b>{" "}
        {[n.dues ? `${n.dues} aidat` : "", n.lessons ? `${n.lessons} yarınki ders` : ""].filter(Boolean).join(" · ")}
      </span>
      <span className="flex gap-2">
        {n.dues > 0 && <Link href="/bildirimler?sekme=aidat" className="btn-primary btn-sm">Aidat hatırlat</Link>}
        {n.lessons > 0 && <Link href="/bildirimler?sekme=ders" className="btn-secondary btn-sm">Ders hatırlat</Link>}
      </span>
    </div>
  );
}
