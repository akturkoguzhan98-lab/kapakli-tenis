import Link from "next/link";
import { Icon, IconName } from "./icons";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/65">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", padded = true }: {
  title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {actions}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

const TONES = {
  green: "bg-lime-300/15 text-lime-200 ring-lime-300/30",
  red: "bg-red-500/15 text-red-300 ring-red-400/30",
  amber: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  clay: "bg-orange-400/15 text-orange-200 ring-orange-300/30",
  gray: "bg-white/10 text-white/75 ring-white/20",
  blue: "bg-sky-400/15 text-sky-200 ring-sky-300/30",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-white/65">{children}</p>;
}

export type Accent = "blue" | "purple" | "gold" | "green" | "red";
// Sınıf adları tam yazılmalı; parça parça birleştirilirse stil dosyasından atılır
const TILE_CLASS: Record<Accent, string> = {
  blue: "tile-blue", purple: "tile-purple", gold: "tile-gold", green: "tile-green", red: "tile-red",
};

/**
 * İstatistik kutusu. accent verilirse kutunun tamamı o renkte cam olur (etiket üstte, büyük rakam,
 * sağ üstte simge). progress (0–1) verilirse doluluk çubuğu gösterilir (ör. tahsilat oranı).
 */
export function Stat({ label, value, hint, href, tone, accent, icon, progress }: {
  label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "red";
  accent?: Accent; icon?: IconName; progress?: number;
}) {
  const pct = progress === undefined ? null : Math.max(0, Math.min(1, progress));
  const inner = accent ? (
    <div className={`tile ${TILE_CLASS[accent]} flex h-full flex-col p-4 transition sm:p-5 ${href ? "hover:-translate-y-0.5 hover:border-white/40" : ""}`}>
      {icon && (
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45)] sm:right-4 sm:top-4 sm:h-10 sm:w-10 print:hidden">
          <Icon name={icon} size={19} />
        </span>
      )}
      {/* Sağda simge için yer bırakılır; uzun başlıklar simgenin altına girmez */}
      <div className={`text-[13px] font-semibold leading-snug text-white/95 ${icon ? "pr-11 sm:pr-12" : ""}`}>{label}</div>
      <div className={`mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px] ${tone === "red" ? "text-red-100" : "text-white"}`}>{value}</div>
      {pct !== null && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20" role="img" aria-label={`%${Math.round(pct * 100)}`}>
          <div className="print-keep h-full rounded-full bg-white print:bg-court-600" style={{ width: `${pct * 100}%` }} />
        </div>
      )}
      <div className="mt-auto pt-2.5 text-xs text-white/75">{hint ?? (href ? "Tümünü gör →" : "")}</div>
    </div>
  ) : (
    <div className={`card h-full p-4 transition ${href ? "hover:-translate-y-0.5 hover:border-white/30" : ""}`}>
      <div className="text-xs font-medium text-white/70">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${tone === "red" ? "text-red-300" : "text-white"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-white/55">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-px overflow-x-auto">{children}</div>;
}
