# CLAUDE.md

Project-specific guidance for working in this repo, beyond what's in `PROJECT_SPEC.md`. Follow these on top of your normal defaults.

## Consistency

- Don't duplicate raw Tailwind utility strings across files. If a class combination (card style, input style, button style) appears more than once, extract it into a shared component in `src/components/ui/` and use that everywhere instead.
- Colors go through the theme tokens defined in `src/index.css` (`ink`, `paper`, `surface`, `border`, `turmeric`, `cardamom`, `chili`, plus `font-sans`/`font-heading`/`font-display`). Never hardcode a hex value in a component — including for cases like `lucide-react` icon colors, where a `text-*` class (icons default to `currentColor`) should be used instead of a raw `color="#..."` prop.
- Before adding a new UI pattern, check `src/components/ui/` and `src/components/` first — reuse or extend an existing primitive rather than writing a one-off.

## Verifying UI work

- Type-checking (`tsc -b`) and linting passing is not sufficient to call UI work done. Before reporting a UI change as complete, actually exercise it — a headless browser check (this project has used Playwright ad hoc for this) beats reasoning from the JSX alone, especially for anything involving animation, page transitions, or fixed/absolute positioning.
- Watch specifically for: layout shift or flicker during route/page transitions, elements that escape their container bounds (including mid-animation, not just at rest), and any visible scrollbar or scrollbar-driven layout shift. These have all been real bugs in this app, not hypothetical.
- A `position: fixed` element nested inside anything that gets an animated CSS `transform` (e.g. a Framer Motion page-transition wrapper) will position itself relative to that transformed ancestor instead of the viewport. Keep fixed-position overlay UI (FABs, nav bars, etc.) as siblings outside animated wrappers, not descendants.
- Clean up any test data created in Supabase while verifying a flow — don't leave scratch products/bills behind in the shared dev database.

## Scope discipline

- Don't invent scope beyond what's asked. Match the simplest reasonable choice when something's ambiguous, note the assumption, and keep moving.
- Respect the phase boundaries in `PROJECT_SPEC.md` section 8 — don't pull work forward from a later phase (e.g. PDF/share UI is Phase 4, full animation polish is Phase 8) even if it would be easy to bolt on while touching adjacent code.
