# Responsive readability upgrade

## What will change
- Widen the homepage and guided-practice content to a responsive 72rem shell with comfortable mobile, tablet, and desktop spacing.
- Rebalance the five-track selector: one row on wide screens, compact grid on smaller screens, with full labels remaining readable.
- Turn homepage learning paths, activities, and modules into responsive card grids while preserving their sequence and existing destinations.
- Keep Anton for major arcade headings, use a readable sans-serif for interface copy and controls, and reserve JetBrains Mono for code and technical counters.
- Increase tiny labels and descriptions, strengthen muted-text contrast, allow essential descriptions to wrap, and retain non-color status cues.
- Reduce starfield/glow intensity behind reading areas and extend reduced-motion handling across decorative and interactive effects.
- Standardize visible keyboard focus rings and minimum 44px touch targets on affected controls.
- Make the practice header, difficulty controls, answer choices, simulator header, tabs, minimize control, hint, and run controls adapt cleanly without clipping.

## Verification
- Check homepage and a GlideRecord practice challenge at 375px, 768px, and 1440px.
- Confirm no page-level horizontal overflow at all six viewport/page combinations.
- Exercise practice selection, run, simulator expand/minimize, visual/log tabs, hint, and focus navigation.
- Check reduced-motion behavior and the latest preview diagnostics.

## Technical details
- Reuse existing semantic colors and components; add only shared typography, focus, motion, and surface tokens/utilities where needed.
- Preserve all routes, task data, saved progress, track behavior, and simulator logic.
