/**
 * Animated starfield background (adapted from a Uiverse.io CSS design).
 * Rendered once behind all app content. Purely decorative.
 */

// Deterministic PRNG so SSR and client markup match exactly.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadows(count: number, seed: number) {
  const rand = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`${Math.floor(rand() * 2000)}px ${Math.floor(rand() * 2000)}px #fff`);
  }
  return parts.join(", ");
}

const STARS_1 = shadows(700, 11);
const STARS_2 = shadows(200, 22);
const STARS_3 = shadows(100, 33);

export function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield-layer starfield-1" style={{ boxShadow: STARS_1 }}>
        <div className="starfield-dup" style={{ boxShadow: STARS_1 }} />
      </div>
      <div className="starfield-layer starfield-2" style={{ boxShadow: STARS_2 }}>
        <div className="starfield-dup" style={{ boxShadow: STARS_2 }} />
      </div>
      <div className="starfield-layer starfield-3" style={{ boxShadow: STARS_3 }}>
        <div className="starfield-dup" style={{ boxShadow: STARS_3 }} />
      </div>
    </div>
  );
}
