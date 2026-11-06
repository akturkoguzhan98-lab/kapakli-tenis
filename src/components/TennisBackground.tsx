// Tenis temalı arka plan parçaları.
// - TennisBackground: giriş/kurulum sayfaları (koyu yeşil, büyük hareketli toplar)
// - Ball, CourtLines: panel sahnesinde (CourtScene) de kullanılır
// Animasyonlar globals.css içindeki "tb-" sınıflarında; "hareketi azalt" ayarında kapanır.

// Kort ölçüleri (metre): yarı uzunluk, yarı çift genişlik, yarı tek genişlik, servis çizgisi
const L = 23.77 / 2, DW = 10.97 / 2, SW = 8.23 / 2, SV = 6.4;

const COURT_LINES: [number, number, number, number][] = [
  [-L, -DW, L, -DW], [-L, DW, L, DW], // çift kenar çizgileri
  [-L, -DW, -L, DW], [L, -DW, L, DW], // dip çizgileri
  [-L, -SW, L, -SW], [-L, SW, L, SW], // tek kenar çizgileri
  [-SV, -SW, -SV, SW], [SV, -SW, SV, SW], // servis çizgileri
  [-SV, 0, SV, 0], // orta servis çizgisi
  [-L, 0, -L + 0.3, 0], [L, 0, L - 0.3, 0], // orta işaretler
];

/** Kuşbakışı kort çizgileri. vertical=true: kort dikey (dar alanlar için). */
export function CourtLines({ color = "#fff", width = 0.08, vertical = false, className = "", posts = true, delay = 0.15 }: {
  color?: string; width?: number; vertical?: boolean; className?: string; posts?: boolean; delay?: number;
}) {
  const P = (x: number, y: number) => (vertical ? [y, x] : [x, y]);
  return (
    <svg
      className={`h-full w-full ${className}`}
      viewBox={vertical ? "-10.5 -19 21 38" : "-19 -10.5 38 21"}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke={color} strokeWidth={width} fill="none" strokeLinecap="square">
        {COURT_LINES.map(([x1, y1, x2, y2], i) => {
          const [ax, ay] = P(x1, y1), [bx, by] = P(x2, y2);
          return (
            <line key={i} x1={ax} y1={ay} x2={bx} y2={by} pathLength={1} className="tb-draw" style={{ animationDelay: `${delay + i * 0.07}s` }} />
          );
        })}
      </g>
      {posts &&
        [-DW - 0.914, DW + 0.914].map((y) => {
          const [cx, cy] = P(0, y);
          return <circle key={y} cx={cx} cy={cy} r={0.22} fill="#2b2b2b" stroke={color} strokeWidth={width * 0.75} className="tb-fade" />;
        })}
    </svg>
  );
}

export function Ball({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f1f78a" />
          <stop offset=".55" stopColor="#cfe03a" />
          <stop offset="1" stopColor="#8fa21c" />
        </radialGradient>
        <filter id={`${id}-f`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 .8  0 0 0 .18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-g)`} />
      <circle cx="50" cy="50" r="48" fill="#000" filter={`url(#${id}-f)`} />
      <path d="M8 30 C 32 40, 32 60, 8 72" stroke="#fbfbf3" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M92 28 C 68 40, 68 60, 92 70" stroke="#fbfbf3" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TennisBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Zemin */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#1f5a3a_0%,#0f2d1c_60%,#0a1f13_100%)]" />

      {/* Silik kort çizgileri (kalemle çiziliyormuş gibi belirir) */}
      <div className="absolute inset-0 opacity-[.14]">
        <CourtLines />
      </div>

      {/* Büyük top: sağ alttan yuvarlanarak gelir, sonra hafifçe salınır */}
      <div className="absolute -bottom-[14vmin] -right-[12vmin] h-[62vmin] w-[62vmin]">
        <div className="tb-float h-full w-full">
          <div className="tb-roll h-full w-full drop-shadow-[0_30px_50px_rgba(0,0,0,.5)]">
            <Ball id="tb-big" />
          </div>
        </div>
      </div>

      {/* Küçük top: yukarıdan düşer ve seker */}
      <div className="absolute left-[6vmin] top-[8vmin] h-[11vmin] w-[11vmin]">
        <div className="tb-bounce h-full w-full opacity-90 drop-shadow-[0_10px_18px_rgba(0,0,0,.45)]">
          <Ball id="tb-small" />
        </div>
      </div>
    </div>
  );
}
