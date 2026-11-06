import { SKILL_GROUPS, SCORE_LABEL, Scores } from "@/lib/skills";

/**
 * Beceri puanları (1-5): her beceri için ince yatay çubuk = bu karne,
 * gri dikey işaret = önceki karne. Puan ve değişim yazıyla da gösterilir (renk tek başına bilgi taşımaz).
 */
export function SkillChart({ current, previous, previousLabel }: { current: Scores; previous?: Scores; previousLabel?: string }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-white/75" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="print-keep h-2 w-5 rounded-full bg-lime-300 print:bg-court-600" /> Bu karne</span>
        {previous && <span className="flex items-center gap-1.5"><span className="print-keep h-3 w-0.5 bg-white/70 print:bg-stone-500" /> Önceki karne{previousLabel ? ` (${previousLabel})` : ""}</span>}
      </div>
      <div className="space-y-5">
        {SKILL_GROUPS.map((g) => (
          <div key={g.name}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/65">{g.name}</div>
            <ul className="space-y-2.5">
              {g.skills.map(([k, label]) => {
                const v = current[k];
                const p = previous?.[k];
                const delta = v !== undefined && p !== undefined ? v - p : null;
                const tip = `${label}: ${v ?? "—"}/5 ${v ? `(${SCORE_LABEL[v]})` : ""}${p !== undefined ? ` · önceki ${p}/5` : ""}`;
                return (
                  <li key={k} className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 sm:grid-cols-[12rem_1fr_6rem]" title={tip}>
                    <span className="truncate text-sm text-white">{label}</span>
                    <div className="relative h-5" role="img" aria-label={tip}>
                      {/* 1..5 kılavuz çizgileri */}
                      <div className="absolute inset-0 flex justify-between">
                        {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="h-full w-px bg-white/10" />)}
                      </div>
                      <div className="absolute top-1/2 h-2.5 -translate-y-1/2 print-keep rounded-full bg-gradient-to-r from-lime-400 to-lime-200 print:bg-court-600 print:from-court-600 print:to-court-600" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
                      {p !== undefined && (
                        <div className="print-keep absolute top-0 h-full w-0.5 bg-white/80 ring-2 ring-[#0d201a] print:bg-stone-600 print:ring-white" style={{ left: `calc(${(p / 5) * 100}% - 1px)` }} />
                      )}
                    </div>
                    <span className="text-right text-sm tabular-nums">
                      <b>{v ?? "—"}</b><span className="text-white/45">/5</span>
                      {delta !== null && delta !== 0 && (
                        <span className={`ml-1.5 text-xs font-medium ${delta > 0 ? "text-lime-200" : "text-red-300"}`}>
                          {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] gap-3 text-[11px] text-white/45 sm:grid-cols-[12rem_1fr_6rem]" aria-hidden>
        <span />
        <div className="flex justify-between"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        <span />
      </div>
    </div>
  );
}
