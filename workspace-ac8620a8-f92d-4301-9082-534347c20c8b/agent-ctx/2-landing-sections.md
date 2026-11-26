# Task 2 — Subagent A: Landing Sections (Work Record)

## Scope
All marketing/landing sections for StudyBuddy AI, strictly inside `src/components/landing/`.
No files outside this folder were created or modified, EXCEPT one lint fix inside the
shared `section-heading.tsx` (see note below).

## Files created (all in src/components/landing/)

| File | Export | Purpose |
|---|---|---|
| `navbar.tsx` | `Navbar` (default) | Fixed top nav; transparent → glass on scroll, logo mark (sky→amber gradient + GraduationCap), desktop links (Problem/Agents/Live Demo/Pipeline) with animated underlines, GitHub outline + "Try Live Demo" CTA, animated mobile dropdown (AnimatePresence height) |
| `hero.tsx` | `Hero` (default) | Two-column hero: hackathon badge w/ pinging amber dot, staggered word-reveal H1 ("StudyBuddy" white + "AI" gradient-sky), CTAs, track chips; right side = self-typing chat mockup (2 looping Q&A pairs, typewriter + amber citation chip + ShieldCheck "zero hallucination" badge) with 3 floating stat chips (Flame/TrendingUp/Database); bottom count-up stats strip (90 sec / 0 / 4 / 2) |
| `marquee.tsx` | `SubjectMarquee` (default) | Infinite CSS marquee of 10 subject pills (BookOpen icons), duplicated array for seamless loop, edge mask-image gradient fade |
| `problem.tsx` | `Problem` (default) | LIGHT section (#F7F8FA, bg-grid-light) — "Current Student Struggle" (white card, rose XCircle items) vs "The StudyBuddy AI Solution" (tinted #EEF3FB card, emerald CheckCircle2 items), centered pulsing sky MoveRight badge between cards on desktop |
| `features.tsx` | `Features` (default) | 4 agent cards (Syllabus RAG / Doubt-Solving / Study-Plan / Quiz & Grading) with tinted icons, mono AGENT NN labels, tag pills, card-glow hover lift; "Golden Architectural Rule" amber left-border highlight bar with oscillating Scale icon |
| `walkthrough.tsx` | `Walkthrough` (default) | DBMS-7-days scenario: glass quote card, 4 step cards connected by animated dashed SVG line with traveling dot synced to an auto-cycling active step (2.5s interval, glow + shimmer on active), impact banner with rotating Timer icon and amber "90 seconds" |
| `architecture.tsx` | `Architecture` (default) | 3-node pipeline (Student Interface → Spring Boot API Core w/ PostgreSQL chip → LangGraph Agent Crew); desktop bidirectional SVG connectors (sky "REST · JSON" →, amber "structured proposals" ←) with pathLength draw-in + flowing .animate-dash overlay + traveling pulse dots; mobile vertical connectors; numbered flow captions (1/2/3) |
| `advantages.tsx` | `Advantages` (default) | 3 centered cards (Zero Hallucinations / True Full-Stack Split / Instant Live Demo) with gradient rings, floating icon loops, hover lift |
| `cta.tsx` | `CtaSection` (default) | Big rounded card with rotating conic-gradient animated border (sky + amber), inner glow orbs, bg-grid, "Turn Exam Chaos into Structured Mastery." headline, dual CTAs, mono hackathon footnote |
| `footer.tsx` | `Footer` (default) | 4-column footer (brand + Product/Agents/Stack), build badge, hairline divider, © 2026 bottom row with track labels |

## Modified (pre-existing shared file, minimal fix)
- `section-heading.tsx` line 55: changed `//` text node to `{"//"}` to fix the ONLY
  eslint error in the landing folder (`react/jsx-no-comment-textnodes`). Renders
  identically; purely a lint fix so `eslint src/components/landing` exits clean.

## Animation techniques used
- framer-motion: whileInView scroll reveals (once, -80px margin), staggered Variants
  (container/item pattern, 0.08–0.12s), AnimatePresence (mobile menu, chat bubbles,
  citation chip), pathLength draw-in (architecture connectors), motion.circle traveling
  dots, ambient orb loops (x/y keyframes, 12–17s infinite), spring-based traveling dot,
  count-up via `animate()` + `useInView`, hover lift/scale on all cards & buttons.
- CSS utilities from globals.css: .animate-marquee, .animate-float, .animate-caret,
  .animate-dash, .animate-shimmer, .animate-pulse-ring, .animate-flame, .glass,
  .card-glow, .text-gradient-sky, .bg-grid/.bg-grid-light, .glow-sky.
- Custom typewriter state machine (setTimeout chain: user→agent→cite→hold→loop).
- 60fps-friendly: only transform/opacity/left on tiny elements + SVG attributes.

## Anchor contract (for orchestrator composing page.tsx)
- My sections define ids: `#top` (hero), `#problem`, `#agents`, `#walkthrough`, `#architecture`.
- Navbar/hero/CTA/footer link to `#demo` — MUST be provided by Task 3's interactive
  demo section (`<section id="demo">`).
- Suggested order: Navbar → Hero → SubjectMarquee → Problem → Features → (Task 3 demo
  section id="demo") → Walkthrough → Architecture → Advantages → CtaSection → Footer.
  (Walkthrough references the demo, so demo before walkthrough works nicely.)
- Parent page should use `min-h-screen flex flex-col` with footer `mt-auto` for the
  sticky-footer rule.

## Verification results
- `bunx eslint src/components/landing --no-warn-ignored` → **0 errors, 0 warnings**.
- `bunx tsc --noEmit -p tsconfig.json` → **no errors in components/landing**.
- `dev.log` tail → clean compiles only, no errors attributable to landing files.

## Risks / notes
- Root `/agent-ctx` was not writable (permission denied) — record written to
  `/home/z/my-project/agent-ctx/2-landing-sections.md` instead.
- Hero floating chips are `hidden sm:flex` (avoid overlap on very small screens).
- Typewriter loop re-renders per character (16–32ms) — cheap (sliced strings), no
  layout thrash (text-only content in fixed-min-height bubbles).
- No emojis used anywhere (Flame icon replaces the deck's fire emoji).
