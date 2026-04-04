# Sleep Engineer

A mobile-first PWA for tracking and improving sleep quality using 29 evidence-based rules. Designed to run as an installed app on phones via Add to Home Screen.

## Commands

```bash
just check          # Run all sanity checks: lint, test, build
just fix            # Format code, then run all sanity checks
just test           # Run tests (vitest)
just test-watch     # Run tests in watch mode
just lint           # Lint and check formatting (biome)
just format         # Auto-fix formatting and lint issues
just build          # Production build to dist/
just dev            # Start Vite dev server
just preview        # Preview production build locally
just install        # Install dependencies
```

Equivalent npm scripts: `npm run check`, `npm run test`, `npm run lint`, `npm run format`, `npm run build`.

## Tooling

- **Biome** — linter and formatter (configured in `biome.json`). 2-space indent, double quotes, 200-char line width. Warnings are acceptable; errors must be zero.
- **Vitest** — test runner (configured in `vite.config.js`). Tests live in `src/App.test.jsx`. Run `just test` to verify.
- **Vite** — bundler and dev server.

## Architecture

**Single-file React app** (`src/App.jsx`). All logic, components, and styles live in one file intentionally — this is a small PWA, not a multi-module project.

### File layout

```
src/App.jsx        — entire application (helpers, business logic, components)
src/App.test.jsx   — unit tests for helpers and business logic
src/main.jsx       — React entry point
index.html         — shell with PWA meta tags and base CSS
public/            — manifest.json, PWA icons
biome.json         — Biome linter/formatter config
vite.config.js     — Vite + React plugin + Vitest config
justfile           — Development command recipes
```

### App.jsx structure (top to bottom)

1. **Storage** — `store.get`/`store.set` wrapper around localStorage with JSON serialization
2. **Time helpers** — `toMins`, `toTime`, `fmt12`, `nowStr`, `todayKey`, `minsUntil`, etc. All times are `"HH:MM"` strings internally; minutes-since-midnight integers for math
3. **Domain constants** — `EV` (event types), `RULES` (29 rules), `CATS`/`CAT_META` (categories), `PASS`/`FAIL`/`PENDING` status constants, `AUTO_RULE_IDS`/`MANUAL_RULE_IDS` (derived from `RULES.auto`)
4. **Business logic** — `deriveSchedule(plan)`, `computeAutoCompliance(plan, events)`, `computeCompliance(plan, events, manual)`, `getCurrentStatus(plan, now)`, `pruneLogs(logs)`
5. **App component** — root state, event handlers, memoized derived values, modal, tab navigation
6. **Tab components** — `HomeTab`, `LogTab`, `ProgressTab`, `ScoreTab`, `PlanTab`, `RulesTab`
7. **Shared** — `Sec` (section label component)
8. **Named exports** — testable functions exported at the bottom for use by `App.test.jsx`

### Key patterns

- **All styling is inline** via `style={{}}` objects. No CSS files, no CSS-in-JS library, no Tailwind.
- **State lives in App**, passed down via props. No context, no state library.
- **localStorage persistence** — three keys: `slp_plan` (wake/bed times), `slp_logs` (events by date), `slp_manual` (manual rule check-offs). Logs are auto-pruned to 90 days.
- **Compliance engine** — 13 rules are auto-tracked from logged events; 16 are manually confirmed. `computeAutoCompliance` returns a `{ R, passed, failed }` object where `R` maps `r1`–`r29` to `PASS`/`FAIL`/`PENDING`.
- **Schedule derivation** — all cutoff times derive from just `plan.bedTime` and `plan.wakeTime`.
- **Expensive computations are memoized** with `useMemo` (schedule, compliance, status, progress `days` array).
- **Event IDs** use `Date.now()-randomSuffix` format (string).
- **Notification timers** are tracked in a `useRef` and cleared before rescheduling.

## Conventions

- **No TypeScript** — plain JSX, no type annotations.
- **Double quotes** for strings throughout.
- **Arrow functions** for helpers and inline callbacks; `function` declarations for components and business logic.
- **Compact style** — one-liners for simple functions, ternaries for simple conditionals.
- **No external state management** — React useState + prop drilling only.
- **No router** — tab-based navigation via a `tab` state string.
- **Constants use UPPER_SNAKE_CASE** (`EV`, `RULES`, `CATS`, `PASS`, `AUTO_RULE_IDS`).
- **Imports sorted by Biome** — run `just format` to auto-sort.

## Performance considerations

This app runs on phones. Keep bundle size small and rendering fast:

- Memoize any computation that touches the full `logs` object or runs `computeAutoCompliance` over multiple days.
- In `ProgressTab`, compliance is computed once per day and cached in the `days` array (`d.R`). Never re-call `computeAutoCompliance` for data already in that array.
- Avoid adding new dependencies without strong justification (current bundle is ~560KB, mostly recharts).
- Inline style objects in `.map()` loops are acceptable for this app size — don't introduce a CSS framework.

## PWA

- `public/manifest.json` configures standalone display, portrait orientation, dark theme (`#070B14`).
- Icons at 192px and 512px in `public/`.
- No service worker yet — the app requires network for initial load but works offline after (all data is in localStorage).
