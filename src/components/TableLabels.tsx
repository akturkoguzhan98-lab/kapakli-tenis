"use client";

import { useEffect } from "react";

/**
 * Telefonda tablolar kart görünümüne geçer (globals.css → .table @media).
 * Kartta her değerin yanında sütun başlığı görünsün diye, başlık metinlerini
 * hücrelere data-label olarak yazar. Sayfa değiştikçe/yenilendikçe tekrar çalışır.
 */
export function TableLabels() {
  useEffect(() => {
    let raf = 0;
    const label = () => {
      raf = 0;
      document.querySelectorAll<HTMLTableElement>("table.table").forEach((t) => {
        const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
        t.querySelectorAll("tbody tr").forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            const l = heads[i] ?? "";
            if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
          });
        });
      });
    };
    label();
    const obs = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(label); });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}
