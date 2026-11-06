// Gelişim karnesinde puanlanan beceriler (1-5)
export const SKILL_GROUPS: { name: string; skills: [string, string][] }[] = [
  { name: "Teknik", skills: [["forehand", "Forehand"], ["backhand", "Backhand"], ["servis", "Servis"], ["vole", "Vole ve smaç"]] },
  { name: "Fiziksel", skills: [["ayak", "Ayak hareketleri"], ["kondisyon", "Kondisyon ve koordinasyon"]] },
  { name: "Oyun ve tutum", skills: [["taktik", "Oyun bilgisi ve taktik"], ["tutum", "Disiplin ve motivasyon"]] },
];

export const SKILLS: [string, string][] = SKILL_GROUPS.flatMap((g) => g.skills);
export const SCORE_LABEL: Record<number, string> = { 1: "Gelişmeli", 2: "Temel", 3: "İyi", 4: "Çok iyi", 5: "Mükemmel" };

export type Scores = Record<string, number>;

export function parseScores(json: string): Scores {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const out: Scores = {};
    for (const [k] of SKILLS) if (typeof o[k] === "number") out[k] = o[k] as number;
    return out;
  } catch {
    return {};
  }
}

export function average(s: Scores): number | null {
  const v = Object.values(s);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Ay'a göre dönem adı önerisi: Eylül-Ocak Güz, Şubat-Haziran Bahar, Temmuz-Ağustos Yaz */
export function suggestTerm(date: string): string {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
  if (m >= 9) return `${y} Güz`;
  if (m === 1) return `${y - 1} Güz`;
  if (m <= 6) return `${y} Bahar`;
  return `${y} Yaz`;
}
