// Panel sayfalarının arka planı: perspektifli tenis kortu sahnesi.
// Sahneyi değiştirmek için aşağıdaki SCENE değerini "gece" ya da "gunbatimi" yapın.
import { Ball } from "./TennisBackground";

export const SCENE: "gece" | "gunbatimi" = "gece";

const L = 23.77 / 2, DW = 10.97 / 2, SW = 8.23 / 2, SV = 6.4;
// Dikey kort çizgileri [x1, y1, x2, y2] (x: en, y: boy)
const LINES: [number, number, number, number][] = [
  [-DW, -L, -DW, L], [DW, -L, DW, L], [-DW, -L, DW, -L], [-DW, L, DW, L],
  [-SW, -L, -SW, L], [SW, -L, SW, L], [-SW, -SV, SW, -SV], [-SW, SV, SW, SV],
  [0, -SV, 0, SV], [0, -L, 0, -L + 0.3], [0, L, 0, L - 0.3],
];

const THEMES = {
  gece: {
    sky: "linear-gradient(180deg,#03070d 0%,#071622 35%,#0b2b2a 70%,#0d3a2a 100%)",
    floor: "#1d6a48",
    surface: "#1f5f8b",
    line: "#ffffff",
    haze: "rgba(4,12,16,.38)",
  },
  gunbatimi: {
    sky: "linear-gradient(180deg,#2a1747 0%,#7a2f56 30%,#d9653b 55%,#f2a65a 70%,#5a3a2a 100%)",
    floor: "#a24c22",
    surface: "#c4622d",
    line: "#fff6ec",
    haze: "rgba(30,10,20,.32)",
  },
};

function Court({ surface, floor, line }: { surface: string; floor: string; line: string }) {
  return (
    <svg viewBox="-7.2 -14 14.4 28" preserveAspectRatio="none" className="block h-full w-full">
      <rect x="-7.2" y="-14" width="14.4" height="28" fill={floor} />
      <rect x={-DW} y={-L} width={2 * DW} height={2 * L} fill={surface} />
      <g stroke={line} strokeWidth={0.09} fill="none">
        {LINES.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      <line x1={-DW - 0.9} y1={0} x2={DW + 0.9} y2={0} stroke="#e9eef2" strokeWidth={0.12} />
      <line x1={-DW - 0.9} y1={0.35} x2={DW + 0.9} y2={0.35} stroke="#000" strokeWidth={0.5} opacity={0.25} />
    </svg>
  );
}

export function CourtScene() {
  const t = THEMES[SCENE];
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden" style={{ background: t.sky }} aria-hidden>
      {SCENE === "gece" ? (
        <>
          {/* Projektörler */}
          {[[6, 8, 260], [4, 30, 160], [4, 62, 160], [6, 84, 260]].map(([top, left, size]) => (
            <div
              key={left}
              className="absolute rounded-full"
              style={{
                top: `${top}%`, left: `${left}%`, width: size, height: size,
                background: "radial-gradient(circle,#fffbe8 0%,rgba(255,244,200,.55) 18%,rgba(255,240,190,0) 70%)",
              }}
            />
          ))}
          {/* Tribün */}
          <div
            className="absolute inset-x-0 top-[30%] h-[16%] opacity-90"
            style={{ background: "repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 2px,transparent 2px 22px),linear-gradient(180deg,#0a1a24,#0c2630)" }}
          />
          {/* Işık huzmeleri */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              background:
                "conic-gradient(from 160deg at 12% 10%, rgba(255,245,210,0) 0deg, rgba(255,245,210,.10) 18deg, rgba(255,245,210,0) 40deg)," +
                "conic-gradient(from 160deg at 88% 10%, rgba(255,245,210,0) 0deg, rgba(255,245,210,.10) 18deg, rgba(255,245,210,0) 40deg)",
            }}
          />
        </>
      ) : (
        <>
          {/* Güneş ve ağaçlar */}
          <div
            className="absolute left-1/2 top-[44%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle,#ffe7b0 0%,rgba(255,200,120,.55) 20%,rgba(255,170,90,0) 65%)" }}
          />
          <div className="absolute inset-x-0 top-[40%] h-[9%]" style={{ background: "linear-gradient(180deg,#2c3b2a,#1f2b1f)" }} />
        </>
      )}

      {/* Perspektifli zemin ve kort */}
      <div className="absolute inset-0" style={{ perspective: 760, perspectiveOrigin: "50% 0%" }}>
        <div
          className="absolute"
          style={{ left: "-60%", width: "220%", bottom: "-12%", height: "118vh", transform: "rotateX(64deg)", transformOrigin: "50% 100%", background: t.floor }}
        >
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "2%", width: "30%", height: "88%", boxShadow: "0 0 120px rgba(0,0,0,.35)" }}>
            <Court surface={t.surface} floor={t.floor} line={t.line} />
          </div>
        </div>
      </div>

      {/* Bulanık toplar (ön plan) */}
      <div className="tb-roll absolute -bottom-[10vmin] -right-[6vmin] h-[42vmin] w-[42vmin] opacity-95 blur-[5px] drop-shadow-[0_30px_40px_rgba(0,0,0,.5)]">
        <Ball id="cs-big" />
      </div>
      <div className="tb-bounce absolute bottom-[16vmin] left-[4vmin] h-[9vmin] w-[9vmin] opacity-80 blur-[2px]">
        <Ball id="cs-small" />
      </div>

      {/* Hafif karartma: yazılar her zaman okunur */}
      <div className="absolute inset-0" style={{ background: t.haze }} />
    </div>
  );
}
