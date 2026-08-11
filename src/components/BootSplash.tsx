import { useEffect, useState } from "react";
import logoAsset from "@/assets/sparkcoder-logo.webp.asset.json";


/**
 * Boot splash: shown in the initial HTML, then glides away once hydration
 * finishes. Purely presentational.
 */
export function BootSplash() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), 420);
    const t2 = window.setTimeout(() => setGone(true), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`boot-splash${leaving ? " boot-splash-leaving" : ""}`}
    >
      <div className="boot-splash-inner">
        <div className="boot-splash-mark font-display">SPARKCODER</div>
        <div className="boot-splash-bar">
          <span />
        </div>
      </div>
    </div>
  );
}
