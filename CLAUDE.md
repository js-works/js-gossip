# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`js-gossip` is a framework-agnostic browser library for **dialogs** (modal info/confirm/decide/form flows) and **toasts** (transient auto-dismissing messages). The core speaks only DOM `Node`s; framework content (Lit, React, …) reaches it through a pluggable content adapter. Distributed as an ESM package with per-feature subpath exports.

## Commands

```bash
npm run dev        # Vite dev server serving the demo (src/demo) — the way to exercise the library by hand
npm run typecheck  # tsc against tsconfig.json (noEmit) — type-checks everything incl. the demo
npm run build      # typecheck, then emit the library to dist/ (tsc -p tsconfig.build.json)
npm run preview    # vite preview (demo)
```

`npm run build` = `tsc && rm -rf dist && tsc -p tsconfig.build.json`. The first `tsc` (base config, `noEmit`) is the type-check gate; `tsconfig.build.json` then flips on emit (`declaration`, `rootDir: src/main`, `outDir: dist`) to produce `.js` + `.d.ts` mirroring the source tree — which is what the package's `main`/`types`/`exports` point at. The demo (`src/demo`) is excluded from the emit. `dist/` is gitignored.

There is **no test runner and no separate linter**. Type-checking *is* the lint gate: `tsconfig.json` runs `strict` plus `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `noFallthroughCasesInSwitch`. Treat a clean `tsc` as the bar for "it passes".

TypeScript is in **bundler mode** with `verbatimModuleSyntax` and `allowImportingTsExtensions`: intra-package imports are written with `.js` extensions (e.g. `import … from "./dialogs/dialogs.js"`) even though the source is `.ts`, and type-only imports must use `import type`. `erasableSyntaxOnly` means no enums or constructor-parameter properties — only syntax that erases cleanly.

## Architecture

### The core / adapter seam (the central idea)

Both features are split into a **framework-free core** and a thin **adapter**. The core owns all state, DOM structure, custom elements, event delegation, animation, and policy; it accepts and inserts only `Node`/`string`/primitive values directly. Anything else is "framework content" and must pass through an adapter that converts it to a `Node`.

The content type is a generic `C` threaded through the entire public API:

- `C` defaults to `never`, so an unconfigured controller is **text-only**.
- Passing an adapter (e.g. `litDialogAdapter`) infers `C` (e.g. `TemplateResult`), and then every `content`/`title`/override return is type-checked against that framework's content.
- Because `C` is enforced at the type level, the core only ever hands a real `C` to the adapter — adapters never need runtime type-guards or null fallbacks. The single erased seam is `insertContent()` in `dialogs/content.ts`, which throws loudly if a non-`Node` object arrives with no adapter (the bug class the design prevents).

When touching content flow, preserve this invariant: **keep framework specifics inside adapter files**; the core stays DOM-only.

### Module layout

Each feature is a directory of focused modules behind a barrel file (`dialogs/dialogs.ts`, `toasts/toasts.ts`) that re-exports only the public surface — those two barrels are what `index.ts` and the package `exports` map point at, so keep their exported names stable. Within a feature the split is roughly: `types.ts` (public types), `content.ts`/`view.ts` (content coercion + internal view-model bridge), `texts.ts`, `buttons.ts`/`options.ts`, `icons.ts`, `styles.ts`, `element.ts` (the custom element), `controller.ts` (orchestration), `adapters.ts` (toasts' framework adapters). The big files are `element.ts` and `controller.ts` — the inherently cohesive element class and controller logic.

**Import-safety (SSR):** importing the package must never touch the DOM, so it can be pulled into a server/SSR module graph (Next.js etc.) without throwing — the DOM is only needed once a controller is actually created in a browser. Two things enforce this and must be preserved: the toast element class is defined lazily inside `ensureElementRegistered()` (not at module load), and `dialogs/element.ts` picks its custom-element base via `typeof HTMLElement !== "undefined" ? HTMLElement : class {}` so `class Dialog extends …` doesn't dereference `HTMLElement` at load. Don't hoist DOM globals (`HTMLElement`, `document`, `customElements`, `window`) into module-top-level code. (`FormData`, used by `FormDialogData`, is a global in all target runtimes — Node ≥18 and edge.) There's a Node smoke test pattern for this: `import()` the built package with no DOM globals stubbed.

`src/main/internal/` holds code genuinely shared by both features: `dom.ts` (the `h()` hyperscript, `parseSvg`, `deepActiveElement`, `doubleRaf`), `icons.ts` (the four severity SVGs — identical across features), `severity.ts` (the `Severity` union), `custom-element.ts` (`registerFirstFreeTag`, the collision-avoiding lazy-registration used by both custom elements), and `css.ts` (`toCssVariable`). Prefer reusing these over re-adding a local copy.

### Dialogs (`src/main/dialogs/`)

- `createDialogsController(config)` → a controller with one-shot methods: `info`/`success`/`warn`/`error`/`confirm`/`decide`/`form`, each with a `*Critical` variant (no Enter-to-confirm default, danger styling).
- **Scopes** (`controller.open(signal)`) share one modal surface: the backdrop stays up across successive dialogs in a scope. A scope's teardown lives in **`close()`**; `[Symbol.dispose]` is aliased to it only when the runtime actually has `Symbol.dispose` (so a scope works with `using` there) — there is **no polyfill**, so internal code and callers on older runtimes must use `close()`, not `[Symbol.dispose]()`. One-shot controller methods internally open a throwaway scope and `close()` it on settle.
- **Results** are a discriminated union on `canceled` (`{ canceled: false, action, data? }` vs `{ canceled: true, aborted }`). Narrow before reading `data`.
- **Forms** return a `FormInteraction`: it is both awaitable (auto-accepts the first valid submit) *and* async-iterable (`for await` yields each `FormAttempt` so callers can `accept()` or `reject(message)` to retry in place with an error notice). `FormDialogData extends FormData` adding typed accessors (`string`/`number`/`integer`/`boolean`/`date`/`file`/`files`/`toRecord`).
- Cancellation flows through `AbortSignal` (scope-level and per-dialog, combined via `AbortSignal.any`).
- The shared hyperscript `h()` (`internal/dom.ts`) builds the internal chrome; styles are one big scoped CSS template string (`dialogs/styles.ts`); icons are inline SVG strings.

### Toasts (`src/main/toasts/`)

- `createToastController(options)` → `info`/`success`/`warn`/`error` (returning a `ToastHandle` with `update`/`dismiss`), plus `promise()` for the loading→success/error pattern, `clear()`, `destroy()`.
- One lazily-registered custom element (`internal-toast-N`) holds a single toast in its shadow root; the controller delegates dismiss/action/hover/swipe events on the container and drives animations (FLIP shuffle, slide/fade exits, countdown ring).
- **Render seam**: the core computes a fully-resolved `ToastView` per toast (title fallback, icon mode, ARIA role, severity prefix) and the adapter only projects that keyed list into DOM. Adapters must render **synchronously** (the core reads hosts back by `data-id` immediately after) — the React adapter uses `flushSync` to honor this.
- Three built-in adapters: `litToastAdapter`, `vanillaAdapter` (string/Node), and `createReactAdapter(react)` (React injected, never imported, so React stays out of deps).
- Theming uses the shared `Theme` (see below): its camelCase keys become `--kebab-case` CSS custom properties set on the container, inherited through the shadow boundary.

### Theme (per-feature)

Themes are **split per feature** — each feature owns its own theme type, defaults, and factory:
- **`DialogTheme` / `defaultDialogTheme` / `createDialogTheme`** in `dialogs/theme.ts` — buttons (`primary*`/`secondary*`/`danger*`), surface (`background`/`text`/`radius`), `closeRadius`/`actionRadius`. Defaults are dark-mode-aware (`light-dark(...)`) with the `--ui-*` host-token passthrough. Passed as `theme?: Partial<DialogTheme>` to `createDialogsController`.
- **`ToastTheme` / `defaultToastTheme` / `createToastTheme`** in `toasts/theme.ts` — severity accents (`infoAccent…loadingAccent`), surface, chrome (`titleColor`/`messageColor`/`close*`), appearance (`solidText`/`dark*`), and three optional override-only tokens (`progressColor`/`iconColor`/`actionColor`, default to the per-severity accent). Passed as `theme?: Partial<ToastTheme>` to `createToastController`.

Each is exported from its feature barrel (so both reach the package root). There is intentionally **no** unified/shared theme — a previous unified `Theme` was a leaky abstraction (the two features' vocabularies genuinely differ), so it was split. `js-gossip/lingo/xwiki` exposes `createXwikiDialogTheme()` and `createXwikiToastTheme()` accordingly.

**Interim application mechanism (known cleanup pending):** themes are currently applied via js-gossip-owned CSS custom properties — `--dialog-*` (set on the dialog element; `dialogs/styles.ts` reads `var(--dialog-*, <default from defaultDialogTheme>)`) and unprefixed `--background`/`--info-accent`/… for toasts. **The intended end state is to bake theme values straight into the generated stylesheet so the core defines no js-gossip custom properties at all** (theme values may still reference the *host's* `--ui-*` tokens — those aren't ours). That refactor (plus purging the runtime-state customs `--toast-scale`/`--toast-duration`/`--toast-play-state`) is deferred; the public theme shapes above are meant to survive it.

### Entry points & subpackages

- `src/main/index.ts` is the package root (`js-gossip`), re-exporting both features. It emits to `dist/index.js`.
- Subpath exports (see `package.json` `exports`) map to sibling dirs under `src/main/`, so the emitted `dist/` layout matches the export targets one-to-one:
  - `js-gossip/lingo`, `/lingo/english`, `/lingo/german` (`src/main/lingo/*`) — **optional** i18n wiring via the `js-lingo` peer dependency. These build translatable namespaces from the cores' `defaultDialogTexts` / `defaultToastTexts` (both are exported for this). Import only if the consumer uses js-lingo.
  - `js-gossip/lingo/xwiki` (`src/main/xwiki/index.ts`) — currently an empty stub.

  When adding or renaming an entry point, keep `package.json` `exports` in step with the `src/main/` layout — the build emits paths verbatim from the source tree.

### Demo (`src/demo/`)

`npm run dev` serves this. It wires both controllers with the Lit adapters and uses [Web Awesome](https://webawesome.com) components (`--wa-*` design tokens mapped onto the library's `--ui-*` variables), demonstrating the intended framework-integration pattern. Vite's `root` switches to `src/demo` for `serve` and to the repo root for `build` (see `vite.config.js`).
