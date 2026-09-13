# Plan 04 — Design System & Cross-Platform UI Foundations

Status: Implemented — resolved 2026-09
Depends on: Plan 01 (`packages/design-tokens`, `packages/ui-web`,
`packages/ui-mobile` exist as empty shells), Plan 03 (`ApiErrorSchema` and
enum conventions this plan's components render)
Blocks: literally every feature plan that renders a form, a list, or an
async action (05 onward) — this is where your three standing requirements
(inline validation, light/dark mode, toast notifications) become reusable
building blocks instead of per-feature decisions.

## 1. Objective

Build the shared foundation that every screen in Plans 15–34 is assembled
from: design tokens, a light/dark theme implementation for both web and
mobile, a shared form-validation pattern that shows errors below the input
as the user types, and a toast system for all transient notifications and
prompts. This plan ships a small set of base components (input, button,
select, toast, modal, card) proven working in both themes on both
platforms — not the full component inventory every later screen will need,
which gets extended incrementally as those screens are built.

"Done" means: a demo screen in `apps/web` and `apps/mobile` that (a) toggles
light/dark, persists the choice, and respects system preference by default;
(b) shows a form field that displays a validation error directly beneath it
while typing, using a schema from `packages/validation`; and (c) fires a
success and an error toast from a button press.

## 2. Decisions carried over

- Web styling: **Tailwind CSS** (per the stack doc).
- Web forms: **React Hook Form + Zod**.
- Mobile animation: **React Native Reanimated** + **Gesture Handler**
  already in the stack — available to this plan for toast/transition
  animation rather than pulling in a separate animation library.
- Mobile state: **Zustand** for anything this plan needs beyond local
  component state (e.g. the current theme, the active toast queue).

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Web component primitives | **Radix UI primitives + Tailwind** (shadcn-style: own the component source, don't depend on a themed component library) | Accessible-by-default (focus trap, aria roles) primitives for Dialog/Select/Checkbox/Tabs/RadioGroup; styling stays 100% in our Tailwind + design tokens, matching the "boring, understandable" infra philosophy |
| Web toast | **Sonner** | Built-in `aria-live`, stacking/queueing, dark-mode aware, minimal API (`toast.success(...)`), widely used |
| Mobile forms | **React Hook Form** on `apps/mobile` too (not just web) | RHF works fine with RN `TextInput`; using the *same* library and the *same* Zod schemas on both platforms means the validation pattern in §6 is genuinely one pattern, not two similar ones. The original stack doc only listed RHF under Web — this plan extends it to Mobile deliberately. |
| Mobile toast | **react-native-toast-message** to start | Mature, queueable, themeable; revisit a Reanimated-custom toast later only if this proves limiting — no need to build our own now |
| Icons | **Lucide** (`lucide-react` web, `lucide-react-native` mobile) | Same icon set, same visual language, on both platforms |
| Fonts | System font stack (`ui-sans-serif`/system-ui) for V1; no custom font yet | Keeps this plan unblocked by a branding decision; swapping in a brand font later is a token-level change, not a rewrite |
| Component documentation | Skip Storybook for V1; use one in-app `/dev/components` demo route (web) instead | Storybook is real value later but is its own setup project; a demo route now costs almost nothing and satisfies this plan's acceptance criteria |

Flag: the mobile-forms and mobile-toast choices are the two most likely to
need revisiting once real forms exist (e.g. the multi-step advert wizard in
Plan 20) — worth confirming now rather than after components are built on
top of them.

## 4. Design tokens (`packages/design-tokens`)

Framework-agnostic token values, consumed by both `ui-web` (via Tailwind
config) and `ui-mobile` (via a plain JS theme object) — one definition,
two consumers.

```ts
// packages/design-tokens/src/colors.ts
export const light = {
  background: "#FFFFFF",
  surface: "#F5F6F7",
  text: "#111417",
  textMuted: "#5B6470",
  border: "#E2E5E9",
  primary: "#2151FF",     // matches the mockups' blue CTA buttons
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",
} as const;

export const dark = {
  background: "#0B0D10",   // matches the mockups' dark navy/black
  surface: "#15181C",
  text: "#F4F5F6",
  textMuted: "#9AA3AD",
  border: "#262B31",
  primary: "#5C82FF",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
} as const;
```

Also defined here: spacing scale (4px base), radius scale, type scale
(sizes/weights/line-heights), and semantic elevation (shadow on web,
`elevation`/shadow props on mobile). `success`/`warning`/`error`/`info`
are the same four semantic colors used for **both** toast variants and
inline field-error styling — one palette for all feedback, not a separate
one per component.

## 5. Theming implementation

**Web**: `next-themes` for persistence + system-preference detection,
driving Tailwind's `class` dark-mode strategy. Tokens are exposed as CSS
variables (`--color-background`, etc.) set per `:root`/`.dark`, and the
Tailwind config maps utility classes to those variables — so a component
written as `bg-background text-text` never has an `if (theme === 'dark')`
branch anywhere.

**Mobile**: a small `ThemeProvider` (React Context + Zustand for the
persisted preference) reads `Appearance.getColorScheme()` for the system
default, persists an explicit override via `AsyncStorage`, and exposes the
active token set to `ui-mobile` components via a `useTheme()` hook. Same
token *names* as web, different delivery mechanism, because RN has no CSS
variables — this is the one place mobile and web genuinely diverge in
implementation while staying identical in the values they render.

Both platforms default to **system preference** and offer an explicit
toggle (Settings screen, per the page inventory's "App Settings" /
"Account Settings") that overrides it.

## 6. Inline validation pattern (the "errors below the input, live" requirement)

One pattern, enforced everywhere a form exists from Plan 07 onward:

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(schema),   // schema from packages/validation
  mode: "onChange",                 // validate on every change, not just submit
  reValidateMode: "onChange",
});
```

- `mode: "onChange"` means a field re-validates on every keystroke once
  it's been touched (RHF's default touched/dirty tracking avoids showing
  an error on a field the user hasn't reached yet — no red errors on an
  untouched, empty form).
- A shared `<FormField>` wrapper (in both `ui-web` and `ui-mobile`) takes a
  `name`, renders its input, and renders `formState.errors[name]?.message`
  directly beneath it in the `error` token color, with `aria-invalid` and
  `aria-describedby` wired to the error's id on web (mobile equivalent:
  `accessibilityInvalid`/`accessibilityDescribedBy` where supported) — so
  every field gets the "error appears immediately below, while typing"
  behavior for free just by using `<FormField>`, no per-form re-
  implementation.
- Pure format/required/range validation (the vast majority of fields) is
  synchronous Zod, so it's genuinely instant — no debounce needed.
- Fields that need a server round-trip (e.g. "is this email already
  registered") are the one case that *is* debounced (~400ms) and shown via
  the same `<FormField>` error slot once the async check resolves — this
  plan defines the `<FormField>` API to support that (an `isValidating`
  state RHF already tracks), but the actual async-check endpoints belong to
  whichever plan owns that field (e.g. Plan 07 for email uniqueness).
- Server-side validation failures that reach the client via
  `ApiError.fieldErrors` (Plan 03 §6) are mapped onto the same `<FormField>`
  errors via RHF's `setError(field, { message })` — one rendering path
  regardless of whether the error originated client-side or server-side.

## 7. Toast system (the "notifications/prompts as toast" requirement)

One thin wrapper API, implemented once per platform, so calling code never
touches Sonner or `react-native-toast-message` directly:

```ts
// packages/ui-web/src/toast.ts and packages/ui-mobile/src/toast.ts
export function showToast(
  variant: "success" | "error" | "info" | "warning",
  message: string,
  options?: { description?: string; durationMs?: number }
): void;
```

Rules:

- Every success confirmation, non-blocking error, and background-job
  result surfaces via `showToast`, never a blocking `window.alert` /
  RN `Alert.alert`. The one exception is a **destructive confirmation**
  ("delete this listing?") which needs an explicit yes/no — that's a
  `<ConfirmDialog>` component (also built in this plan, using Radix
  Dialog / a RN modal), not a toast; toasts are for feedback, dialogs are
  for decisions.
- An `ApiError` with no `fieldErrors` (Plan 03 §6) is always toast-able
  directly from its `message` — a shared `useApiErrorToast()` hook wraps
  this so a failed mutation anywhere in the app can do
  `onError: (e) => showApiErrorToast(e)` and get consistent behavior.
- Toast variant colors reuse the same `success`/`warning`/`error`/`info`
  tokens as inline field errors (§4) — a red toast and a red field error
  are visually the same "red."
- Toasts are transient and unread-tracked-nothing; anything that needs to
  persist and be marked read/unread (price-drop alert, new message) is the
  **Notification Centre** from Plan 24, not this system — Plan 24 may
  *also* fire a toast for the realtime case ("you're online and a message
  just arrived"), but the stored record lives elsewhere.

## 8. Base component inventory shipped by this plan

Minimum set needed to prove the patterns above and unblock Plan 05/07;
everything else (date pickers, sliders, photo galleries, etc.) is added by
the feature plan that first needs it, using these as building blocks.

```text
Button          (primary / secondary / destructive / ghost, loading state)
Input           (text/number/password, used inside FormField)
Select
Checkbox
RadioGroup
FormField        (label + input slot + inline error, §6)
Card
Tabs
Badge            (for statuses: Live/Draft/Sold, Great Price, etc.)
Modal / Dialog
ConfirmDialog     (destructive-action confirmation, §7)
Toast             (provider + showToast API, §7)
Spinner
Skeleton          (loading placeholders)
EmptyState
```

## 9. File structure additions

```text
packages/design-tokens/src/{colors,spacing,typography,radius}.ts

packages/ui-web/src/
├── theme/            (next-themes wiring, Tailwind var mapping)
├── toast.ts
├── components/        (Button, Input, FormField, ...)
└── index.ts

packages/ui-mobile/src/
├── theme/             (ThemeProvider, useTheme)
├── toast.ts
├── components/
└── index.ts

apps/web/app/dev/components/page.tsx     # demo route (§3, docs stand-in)
apps/mobile/app/dev-components.tsx        # demo screen, same purpose
```

## 10. Out of scope for this plan

- Any screen-specific component (photo swiper, spec comparison table,
  advert wizard steps, etc.) → built in the plan that owns that screen,
  on top of §8's primitives
- Real forms with real Zod schemas for actual entities → Plan 07 onward;
  this plan's demo form uses a throwaway schema just to prove the pattern
- The persistent Notification Centre → **Plan 24**
- Brand identity work (logo, custom font, final color values beyond the
  mockup-matched placeholders in §4) — the tokens above are a reasonable
  starting palette pulled from the mockups, not a finished brand decision

## 11. Acceptance criteria

- [x] Toggling theme on the web demo route persists across reload and
      defaults to system preference on first visit; same for mobile.
      (`next-themes` + `localStorage` on web; a Zustand store persisted via
      `AsyncStorage` on mobile — both default to `'system'`.)
- [x] Every color in §4 meets WCAG AA contrast against its paired
      background in both themes (checked with an automated contrast tool
      as part of this plan, not left to manual eyeballing). See
      `packages/design-tokens/src/contrast.ts` + `contrast.test.ts` (24
      assertions) — a hand-rolled WCAG relative-luminance/contrast-ratio
      implementation, no new dependency. One color (`error`, light theme)
      was nudged from `#DC2626` to `#D62020` to clear 4.5:1 against
      `surface`; a `borderStrong` token was added alongside the original
      (decorative) `border` for the one pairing needing 3:1
      non-text-contrast (input outlines) — see colors.ts's comments for
      the reasoning. No other hex value changed.
- [x] The demo form shows a validation error beneath an input while typing
      (before submit is pressed), for both a sync rule (required/format)
      and a simulated async rule (debounced), on both web and mobile.
- [x] A demo button fires each of the four toast variants; a destructive
      demo action opens `ConfirmDialog` instead of a toast.
- [x] `showApiErrorToast(ApiError)` correctly toasts `message` and, when
      `fieldErrors` is present instead, does *not* also toast — it defers
      to the form's inline errors so the user doesn't see the same problem
      reported twice. Covered by tests on both platforms.
- [x] All components in §8 render correctly in both themes on both
      platforms with no hard-coded colors outside `design-tokens`, with one
      symmetric exception on both platforms: the Dialog/Modal backdrop
      scrim (`rgba(0,0,0,0.5)`) is a fixed dimming overlay, not a themed
      surface — same treatment `elevation.ts`'s shadows already get (see
      that file's comment) and the same value on both web
      (`dialog.tsx`'s `bg-black/50`) and mobile (`modal.tsx`).

Verified with `pnpm typecheck && pnpm lint && pnpm test` green across all
18 workspace packages, plus a real `next build` (apps/web, confirms the
Tailwind → CSS-variable → dark-mode pipeline actually compiles, not just
typechecks) and a `storybook build` (packages/ui-web).

## 12. Open questions — resolved 2026-09

1. **Confirmed** — Radix + Tailwind (web) and RHF-on-mobile-too, as
   recommended.
2. **Close enough to lock in** — the §4 palette's hex values are unchanged
   from the mockup-derived originals (the one exception, `error` in light
   mode, was a 1-step darkening forced by WCAG AA on `surface`, not a
   design change — see §11).
3. **Set up properly** — Storybook (v10, `@storybook/react-vite` +
   `@tailwindcss/vite`, `addon-a11y`/`addon-docs`/`addon-themes` for a
   light/dark toolbar toggle) replaces the "defer it" recommendation in §3;
   every §8 component has a `.stories.tsx` alongside it in
   `packages/ui-web/src/components/`, run via `pnpm --filter
   @vehicles-marketplace/ui-web storybook`. This was scoped to `ui-web`
   only — Storybook for React Native (`ui-mobile`) is a materially
   separate setup (its own Metro/RN builder) and wasn't asked for; revisit
   if `ui-mobile`'s component count grows enough to need the same
   documentation.

## 13. Deviations from this plan worth flagging

- **`react-native-reanimated` is installed but not used for animation.**
  §2 reserved it for toast/transition animation; in practice
  `react-native-toast-message` already animates on RN's built-in
  `Animated` API, and Reanimated 4 splits its babel plugin into a separate
  `react-native-worklets` package that this pnpm-strict monorepo doesn't
  resolve by default (traced via `--traceResolution`: babel-preset-expo
  silently skips the transform if it can't resolve that plugin, which
  would leave worklet-based code broken at runtime with no build-time
  error). `Skeleton`'s pulse and `Modal`'s backdrop fade use plain
  `Animated` instead — verifiable and dependency-free. Both
  `react-native-reanimated` and `react-native-gesture-handler` are still
  installed and wired at the root (`GestureHandlerRootView` in
  `_layout.tsx`) per §2's decision, ready for a future plan that needs
  gesture-driven interaction.
- **`packages/ui-mobile/src/lib/rn-style.ts`.** `react-native@0.87` ships
  two structurally-incompatible sets of style types (a hand-written
  `ViewStyle`/`TextStyle` and a separate newer generated one that some
  components' actual `style` prop resolves to instead) — reproduced with
  an object as trivial as `{ flexDirection: 'row' }` against `Pressable`.
  Every `ui-mobile` component routes its style objects through the
  `rnStyle()` helper there rather than annotating/asserting against
  `ViewStyle`/`TextStyle` directly; see that file's comment for the full
  trace. Purely a TypeScript-level workaround — no runtime behavior
  differs.
