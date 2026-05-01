# SafeWalk — Design Handoff

## Overview
SafeWalk is a personal safety walking app for students and solo walkers. Map-first home (idle vs. active states), trusted-contact alerting, a 5-stage escalation ladder, and a press-and-hold SOS. This handoff bundles:

1. **A marketing landing page** (`index.html` + `landing.jsx`) — hero, trust strip, press strip, How it works, feature grid, screenshot showcase, stats, 7 reviews, FAQ, final CTA band, footer. The "Try SafeWalk free" CTAs route to the app's sign-in/sign-up flow.
2. **A complete high-fidelity app prototype** (`SafeWalk.html` + `screens-*.jsx` + `interactive.jsx`) — all 15 MVP screens plus a fully interactive flow (sign in → home → start walk → check-in → press-and-hold SOS → escalation).

### Entry points
- `/` (`index.html`) — public marketing landing page (default).
- `/SafeWalk.html` — the app prototype (sign-in is the entry; flow is interactive end-to-end).

### Recommended Claude Code prompt
> Read `design_handoff_safewalk/README.md` plus the two `.docx` specs. Scaffold a React + TypeScript + Vite + Tailwind + Supabase project per the MVP spec §2.1. Build the **public landing** at `/` (recreating `landing.jsx` as real React components — separate file per section: `Hero.tsx`, `HowItWorks.tsx`, `Features.tsx`, etc.) and the **app** at `/app/*` mounted behind auth. Use the HTML/JSX in this folder as visual reference only; port the tokens in `styles.css` into `tailwind.config.js`. Implement screens in the order listed in this README's "Build order".

## About the design files
The files in this bundle are **design references created in HTML/React-via-Babel**. They are *prototypes showing intended look, layout, copy and behavior* — they are **not** production code to copy verbatim. Your job is to **recreate these designs in the target codebase's environment**: React 18 + TypeScript + Vite + Tailwind + Supabase + Mapbox GL JS, as specified in the original `SafeWalk_MVP_Spec`. Apply that codebase's patterns, hooks, services and folder structure (MVP spec §2.1).

### File map
| File | Contents |
|---|---|
| `index.html` | Landing page entry — loads `landing.jsx` |
| `landing.jsx` | All landing-page sections + 6 SVG illustrations + marketing phone mockup |
| `SafeWalk.html` | App prototype entry — design canvas of all 15 screens + interactive flow |
| `styles.css` | Design tokens + base components (buttons, fields, sheets, map placeholder, tab bar) |
| `primitives.jsx` | Icons, Logo, MapCanvas, UserPin, DestPin, RouteLine, Avatar, Badge, Toggle, TabBar, StatusBar |
| `screens-auth.jsx` | Sign in, sign up, check email, onboarding 1–3 |
| `screens-walk.jsx` | Home idle, destination set, active walk, check-in overlay, SOS triggered, escalation ladder |
| `screens-app.jsx` | Contacts, add contact sheet, history, settings, public Track view |
| `interactive.jsx` | Stateful wrapper with navigation, live timers, press-and-hold SOS |

## Fidelity
**High-fidelity.** All colors, typography, spacing, radii, copy and interaction states are final. Recreate pixel-perfectly. Things that are intentionally placeholder and need to be swapped at build time:
1. The hand-rolled SVG "map" — replace with **Mapbox GL JS** (`mapbox://styles/mapbox/streets-v12`).
2. The simulated SMS / call flows — wire to **Supabase Edge Functions + Twilio** per the MVP spec §3.4.
3. Landing-page review names/quotes and stats are illustrative — replace with real testimonials when available.
4. Press-strip names ("The Globe", "CBC", etc.) are placeholder typography — swap for real logos only after press coverage is confirmed.

## Design tokens
Already encoded in `styles.css` as CSS custom properties. Port these into `tailwind.config.js`:

| Token | Value | Use |
|---|---|---|
| `purple-50` | `#EEEDFE` | Info boxes, badge bg, avatar bg |
| `purple-100` | `#DCD9FB` | Borders on light surfaces |
| `purple-200` | `#AFA9EC` | Inactive progress dots |
| `purple-400` | `#7F77DD` | Primary buttons, user pin, brand |
| `purple-500` | `#6B62D4` | Hover |
| `purple-600` | `#534AB7` | Pressed, active text |
| `purple-800` | `#3C3489` | Text on purple-50 |
| `dark` | `#1A1A28` | Body text |
| `gray-text` | `#888899` | Secondary labels |
| `gray-bg` | `#F0F0F4` | Page bg, stats cards |
| `gray-border` | `#E0E0E8` | Card outlines, dividers |
| `green / green-bg` | `#3B6D11 / #EAF3DE` | "Completed", "All good" |
| `amber / amber-bg` | `#854F0B / #FAEEDA` | Check-in, escalating |
| `red / red-text / red-bg` | `#E24B4A / #A32D2D / #FCEBEB` | SOS, 911 |

**Type:** Inter (400/500/600/700/800). Title 26px / body 14px / caption 12px / label 11px.
**Radii:** 8px (badges), 12–14px (cards/inputs), 24px (sheets), 50% (avatars/SOS).
**Shadows:** sheets `0 -4px 24px rgba(0,0,0,0.08)`; modals `0 -10px 40px rgba(0,0,0,0.18)`; SOS `0 0 0 3px #E24B4A, 0 8px 22px rgba(226,75,74,0.45)`.
**Touch targets:** ≥48px for everything interactive.

## Screens included (15)
1. **Sign in** (`SignInScreen` in `screens-auth.jsx`) — email + password, "End-to-end encrypted · PIPEDA compliant" purple info box.
2. **Sign up** — name + email + password with live strength meter.
3. **Check email** — green check icon, primary "Open email app", ghost "Resend".
4. **Onboarding 1** — purple-tinted illustration with concentric rings + walking icon, "Stay safe while you walk."
5. **Onboarding 2** — inline "Add trusted contact" form with "Set as primary" toggle.
6. **Onboarding 3** — modal-style location permission sheet over dimmed map.
7. **Home — idle** (`HomeIdleScreen`) — map fills viewport, top logo + avatar, bottom sheet ~220px tall: search → 3 stat cards → primary "Start walk" CTA.
8. **Destination set** — From/To column with purple route line on map, "8 min · 0.7 km · 3 contacts ready" before "Start walk".
9. **Active walk** (`ActiveWalkScreen`) — top status banner ("Walk in progress · sharing with 3 contacts"); bottom sheet with purple check-in countdown bar, 3 stats (Time / Distance / ETA), SOS round button + helper + End walk.
10. **Stage 1 check-in overlay** — amber background sheet over dimmed map, alert icon, "Are you okay?", `0:30` countdown, full-width amber "I'm okay".
11. **SOS triggered** — full red gradient with pulsing rings around white SOS disc, list of 3 contacts marked SMS-sent, two CTAs (cancel / 911).
12. **Escalation ladder** — top red banner, 5-stage list with done/active/pending dots, primary cancel + secondary 911.
13. **Contacts** — purple info box, contact cards with avatar + Primary badge + chevron, "3 of 5 · 2 slots remaining".
14. **Add contact sheet** — modal bottom sheet over contacts.
15. **History** — walk rows with icon + dest + date/dur/dist + status badge.
16. **Settings** — profile card, Notifications/Privacy/Data sections built from `SettingRow` (toggle) + `SettingLink` (chevron) primitives, version footer + sign-out.
17. **Public Track view** (`/track/:token`) — purple gradient header with LIVE badge, embedded map (~280px), info rows, two big CTAs ("Call Alex" / "Call 911"), trust footer.

## Interactions & behaviour
- **Tab bar nav** — bottom 78px tabs (Home / Contacts / History / Settings); active = purple.
- **Map** — always rendered. **Don't unmount on walk start** — only the bottom sheet animates between idle (~220px) and active (~280px) states via `transform: translateY()`.
- **User pin** — 18px purple circle, 3px white border, animated pulse ring (CSS keyframes — see `.sw-pin::before` / `@keyframes sw-pulse` in `styles.css`).
- **Destination pin** — purple teardrop with floating white ETA chip above.
- **Route polyline** — purple stroke `#7F77DD`, 5px, dashed `8 8`, animated `stroke-dashoffset` for "moving ants" feel.
- **Check-in countdown** — runs every second from 90s; on 0 trigger Stage 1 overlay (use `useCheckIn` hook per MVP spec §7).
- **Press-and-hold SOS** — `pointerdown` starts a 3000ms ramp; SVG circle stroke-dashoffset draws a ring around the button as it fills; `pointerup`/`pointerleave`/`pointercancel` cancel; on completion fire `navigator.vibrate([100,50,100,50,200])` and skip directly to Stage 2. Reference impl: `ActiveInteractive` in `interactive.jsx`.
- **Escalation ladder** — 5 stages, each row has a status dot (✓ done / red filled active w/ glow / gray pending number). Uses the schema in MVP spec §3.2 (`escalation_events` table).
- **Toggle / Toggle** — 44×26 pill, `transform: translateX(18px)` on knob.
- **All transitions** — 150–200ms ease except sheet slides at 250–300ms.

## State management
Per MVP spec §2 — Zustand for global walk + auth state, React Query for Supabase data. Reference state shapes:
- `walkStore`: `{ sessionId, status: 'idle'|'active'|'escalating'|'sos', startedAt, secondsElapsed, distance, checkInRemaining, escalationStage }`
- `authStore`: `{ user, profile, onboardingCompleted }`

## Files in this bundle
| File | What it is |
|---|---|
| `SafeWalk.html` | Entry — pulls everything together via design canvas |
| `styles.css` | Design tokens + utility classes (port to Tailwind config) |
| `primitives.jsx` | Icons, Logo, MapCanvas (replace w/ Mapbox), Avatar, Badge, Toggle, TabBar |
| `screens-auth.jsx` | Sign in / sign up / check email / onboarding 1–3 |
| `screens-walk.jsx` | Home idle / destination / active walk / check-in / SOS / escalation |
| `screens-app.jsx` | Contacts / add-contact / history / settings / public track |
| `interactive.jsx` | Stateful prototype controller — reference for navigation + SOS hold logic |
| `SafeWalk_MVP_Spec.docx` | Original product/build spec — **single source of truth** for backend, data, RLS, Edge Functions |
| `SafeWalk_Visual_Spec.docx` | Original visual spec — additional details |

## Implementation order (from MVP spec §16)
1. Foundation — Supabase tables, RLS, Tailwind tokens, base UI components
2. Auth — sign up / sign in / forgot / reset / callback / ProtectedRoute
3. Onboarding — 3 steps, set `onboarding_completed`
4. Home + Mapbox + idle sheet + geolocation + ping writes
5. Active walk — session timer, check-in bar, end walk
6. Check-in + escalation — `useCheckIn`, overlay, ladder, `escalation_events` writes
7. SOS — press-and-hold, vibration, Stage-2 skip
8. Alerts — `send-alert` + `initiate-call` Edge Functions, Twilio
9. Public `/track/:token` — share-token RLS path, 15s auto-refresh
10. Contacts CRUD
11. History
12. Settings + data export / delete
13. Polish, Lighthouse, PWA manifest

## Notes
- Replace SVG map with Mapbox GL JS — keep the user-pin and route-line styling identical (purple #7F77DD with white border + pulse).
- All copy in the prototype is final — lift verbatim.
- The escalation overlay is one component — show/hide based on `walk.status === 'escalating'`.
- The Track page must work without auth and load <2s on 4G — keep it minimal, use Supabase share-token RLS policy from the MVP spec.
