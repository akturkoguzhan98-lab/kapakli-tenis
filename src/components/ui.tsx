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
const ACCENT_CLASS: Record<Accent, string> = {
  blue: "accent-blue", purple: "accent-purple", gold: "accent-gold", green: "accent-green", red: "accent-red",
};

export function Stat({ label, value, hint, href, tone, accent, icon }: {
  label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "red"; accent?: Accent; icon?: IconName;
}) {
  const inner = (
    <div className={`card h-full overflow-hidden transition ${href ? "hover:-translate-y-0.5 hover:border-white/30" : ""}`}>
      {accent && (
        <div className={`${ACCENT_CLASS[accent]} flex h-14 items-center px-4 print:hidden`}>
          {icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]">
              <Icon name={icon} size={17} />
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className={`font-semibold tracking-tight ${accent ? "text-2xl" : "mt-1 text-2xl"} ${tone === "red" ? "text-red-300" : "text-white"}`}>{value}</div>
        <div className="mt-0.5 text-xs font-medium text-white/70">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-white/55">{hint}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
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
