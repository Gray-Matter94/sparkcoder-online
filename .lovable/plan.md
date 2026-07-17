# Apply the Apple design system site-wide

Adopt the tokens, typography, and visual philosophy from `apple.design.md` as the site's new global look. This is a full visual rebrand from the current dark neo-brutalist theme (Anton + JetBrains Mono + green/pink/amber on black) to Apple's photography-first, single-accent system (SF Pro + Action Blue on white/parchment/near-black tiles). No feature or route changes — only presentation.

## Scope

- Global theme tokens, typography, radii, spacing scale.
- Shared chrome: root layout, `StatsBar`, `TrackSwitcher`, `ErrorBoundary`, buttons, cards, dialogs, sheets, badges (shadcn primitives in `src/components/ui/`).
- High-traffic pages get a first-pass polish to match: `/` (home), `/learn`, `/learn/discovery` + `$section`, `/live-coding`, `/blog`, `/feedback`.
- Everything else inherits the new tokens automatically; residual custom colors get swept in a follow-up if needed.

Out of scope: business logic, routes, data model, copy.

## Token mapping (src/styles.css)

Rewrite the `@theme` block to Apple tokens (light canvas as default; dark tiles used as sections, not as the global background):

```text
--color-background      #ffffff   (canvas)
--color-foreground      #1d1d1f   (ink)
--color-primary         #0066cc   (Action Blue)
--color-primary-foreground #ffffff
--color-accent          #0066cc   (single accent — no secondary)
--color-panel           #f5f5f7   (parchment)
--color-panel-2         #fafafc   (pearl)
--color-muted           #f5f5f7
--color-muted-foreground #7a7a7a
--color-border          #e0e0e0   (hairline)
--color-input           #e0e0e0
--color-ring            #0071e3
--color-destructive     keep semantic red, tuned to Apple palette
--color-card / popover  #ffffff
Dark-tile section tokens: --tile-1 #272729, --tile-2 #2a2a2c, --tile-3 #252527, --on-dark-link #2997ff
```

Radii collapse to Apple's ladder: `--radius-sm 8px`, `--radius-md 11px`, `--radius-lg 18px`, `--radius-pill 9999px`. Add a single elevation token `--shadow-product: 3px 5px 30px rgba(0,0,0,0.22)` — reserved for product/hero imagery only. Remove decorative shadows, gradients, and the liquid-glass utility from general chrome (keep it available but stop applying it globally).

## Typography

- Load SF Pro via `<link>` in `src/routes/__root.tsx` head (Apple's public CDN or a Fontsource fallback; if unavailable, use `system-ui, -apple-system` which resolves to real SF Pro on Apple devices, else Inter as fallback).
- Replace `--font-display` and `--font-sans`/`--font-mono` in `@theme`:
  - `--font-display: "SF Pro Display", system-ui, -apple-system, sans-serif`
  - `--font-sans: "SF Pro Text", system-ui, -apple-system, sans-serif`
  - `--font-mono` unchanged (JetBrains Mono for code blocks only).
- Add utilities for the Apple type ladder (hero-display 56/600/-0.28, display-lg 40/600, lead 28/400, tagline 21/600, body 17/400/-0.374, caption 14). Body defaults to 17px — override Tailwind's `text-base` at `:root` via a body class rather than fighting utilities everywhere.
- Remove Anton `@font-face` block.

## Component pattern shifts

- Buttons: primary = Action Blue pill, 11px 22px, `text-white`; secondary = white pill with blue text; ghost text-link is blue. Update `src/components/ui/button.tsx` variants.
- Cards / panels: white or parchment surface, hairline border `#e0e0e0`, radius 18px, no shadow.
- Nav / `StatsBar`: black bar (44px) with white 12px nav-link text, or parchment sub-nav (52px) — pick per-page. Remove neon accent chips.
- Section rhythm: introduce a `<Tile variant="light|parchment|dark">` wrapper (new `src/components/Tile.tsx`) for edge-to-edge alternating sections on marketing routes (home, learn hubs). Existing content slots inside without markup changes.
- Code blocks keep the dark tile treatment (surface-tile-1 background, mono font) — this fits Apple's dark-tile pattern naturally.

## Pages touched in first pass

1. `src/routes/__root.tsx` — SF Pro `<link>`, body class for 17px base.
2. `src/styles.css` — full token + utility rewrite.
3. `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx` — variant updates to Apple pill/hairline patterns.
4. `src/components/StatsBar.tsx`, `TrackSwitcher.tsx` — swap neon accents for Action Blue + black/parchment chrome.
5. `src/routes/index.tsx` — restructure hero + track cards into alternating light/parchment/dark tiles.
6. `src/routes/learn.discovery.tsx` + `$section.tsx` — hairline cards, blue links, remove uppercase-mono eyebrows in favor of Apple caption style.
7. `src/routes/live-coding.tsx` — keep the dark simulator (fits dark-tile pattern), but reskin surrounding chrome/buttons to the new tokens.
8. Sweep any remaining hardcoded `text-white`, `bg-black`, brand hex values via ripgrep and route through tokens.

## Verification

- Build passes (auto).
- Load `/`, `/learn`, `/learn/discovery`, `/live-coding` in the preview and screenshot each. Check body reads at 17px, Action Blue is the only accent, hairline borders replace heavy borders, no stray gradients/shadows, contrast passes AA on both light and dark tiles.
- Confirm the CSS entry still starts with `@import "tailwindcss"` (Tailwind v4 constraint) and no remote font is imported inside `src/styles.css`.

## Notes

- SF Pro is not on Google Fonts. Options, in order: (a) rely on `system-ui, -apple-system` (renders true SF Pro on Apple devices, falls back on others — matches Apple's own approach), (b) add `@fontsource-variable/inter` as the cross-platform fallback family. I'll go with (a) + Inter fallback via Fontsource so non-Apple visitors still get the close substitute the spec recommends.
- This is a big visual change — the site will look nothing like today. Confirm before I proceed if you'd rather scope it (e.g., start with tokens + home page only).
