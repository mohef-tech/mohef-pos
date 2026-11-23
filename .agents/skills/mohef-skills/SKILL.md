---
name: mohef-skills
description: Unified UI craft, anti-slop quality filter, and lean senior-dev coding discipline. Use when designing, auditing, refactoring, or building landing pages, web apps, dashboards, UI copy, mobile layouts, or production code so the output has real product character, meets WCAG AA accessibility and mobile reflow standards, avoids AI-generated visual/copy slop, and ships the smallest complete working diff.
---

# mohef-skills

Turn generic, AI-looking UI and over-engineered code into deliberate, accessible, lightweight products with distinct character.

## Communication Rules

- Always respond, audit, and explain in the user's chat language.
- Be direct and concise: zero filler, zero pleasantries, zero chatbot closers, while keeping clear full sentences.
- **Step-by-step execution:** Execute only 1 step at a time, then stop and wait for user confirmation before continuing to the next step.
- **No post-task summaries:** After finishing a step or task, do not write a recap or summary. Simply confirm it is done, give the check instruction if needed (e.g. `npm run dev`), and state if no errors were found. Only add a brief explanation when genuinely needed or when flagging something skipped, unverified, or risky.
- **User override:** The step-by-step and no-summary rules above can be changed or bypassed anytime the user explicitly asks.

## 1. Workflow & Gates

### Existing UI (Redesign or Audit)

1. **Inspect first:** Read the UI files (and screenshot if provided) before judging anything.
2. **Audit:** List every slop sign with its exact file location and priority: `HIGH` (Hard Gate), `MEDIUM` (Purpose-Gate), `LOW` (Quality Lock). Rate the screen honestly:
   - **Heavy slop:** Run the full 9-pass redesign.
   - **Light slop:** Polish mode only. Fix audited defects and keep the existing brand, palette, type, and layout.
   - **No slop:** State it plainly and suggest at most 2-3 small refinements. Never redesign a good screen just to make it different.
3. **Direction & Dials:** Write 5 concrete lines + 1 Design Read line before touching code:
   - **Product:** What it does and for whom in one plain sentence.
   - **Character:** 2-3 concrete words (forbidden buzzwords: clean, modern, sleek, minimal, premium).
   - **World:** The real-world material or setting the product belongs to (drives neutral tint, accent, and visuals).
   - **Moments:** 1-2 content focal points where rich color, material, or detail lives.
   - **Signature:** 1 small, consistent detail unique to this product.
   - **Design Read:** `Reading this as: <page kind> for <audience>, style <visual language>, dial ENERGY <1-3> / RHYTHM <1-3> / MOTION <1-3>.`
   - Preserve real existing brand assets (logo, brand hex colors, brand typeface) unless they are pure slop (sparkle tiles, purple glow gradients).
4. **Stop and confirm:** Present the Audit and Direction, then wait for user approval before editing any code (skip waiting only if the user explicitly instructed immediate execution).
5. **Execute pass by pass:** Apply the 9 passes in order, then run the Delivery Gate.

### New UI (From Scratch)

Set Direction + Design Read (3 Dials) -> confirm with user -> build following Sections 2, 3, and 4 -> run Delivery Gate. If built without user direction, label it explicitly as `draft without direction` with `ENERGY 1 / RHYTHM 1 / MOTION 1`.

### Code-Only Tasks (Bugfix, Feature, Refactor)

Skip visual passes. Apply Section 4 (Lean Engineering) and the Code/Functional checks in Section 5.

## 2. Hard Gates (Non-Negotiable)

Breaking any item below is a FAIL regardless of visual style:

- **Honesty & evidence:** Never fabricate statistics, testimonials, user names, security/compliance claims, or fake form/table data. Use real data or explicit honest placeholders (`[REAL DATA]`, `Coming soon`). Ask before inventing brand logos or people avatars.
- **Functional completeness:** Zero dead buttons and zero nav links pointing to non-existent sections. Every data view must handle empty, loading, and error states clearly (stating cause and next action). If a theme toggle exists, every mode must work cleanly.
- **WCAG AA contrast:** Normal text >= 4.5:1; large text (18px+) and non-text UI boundaries/states >= 3:1. Verify pairings mathematically or against known safe pairs; never eyeball grey-on-grey or text over gradients/images.
- **Keyboard & focus:** All interactive elements operable via `Tab`, `Enter`/`Space`, and `Escape` (closes modals/dialogs). Every focusable element needs a visible `:focus-visible` indicator (>= 3:1). Never set `outline: none` without a replacement.
- **Semantics & affordances:** Set `cursor: pointer` once in base CSS for enabled interactive elements (`cursor: not-allowed` for disabled). Use `<button>` for actions and `<a href>` for navigation (no clickable `div`/`span`). Every icon-only button needs `aria-label` (icon `aria-hidden="true"`), every image needs `alt`, every input needs a visible `<label>`. Never use color as the sole feedback signal. Respect `prefers-reduced-motion: reduce`. Whole documents require `<html lang>`, unique `<title>`, landmarks (`header`, `nav`, `main`, `footer`), one `<h1>`, and must never disable zoom.
- **Mobile reflow:** Design mobile as a distinct layout, not squeezed desktop. Define intermediate states for tablet/small-laptop widths (avoid jarring two-state jumps). Zero horizontal overflow, no clipped text at 200% zoom, avoid rigid `100vh` (use `auto`, `svh`, or `dvh`). Minimum 44x44px tap targets with clear spacing, tap equivalents for hover-only UI, and compact sticky headers.
- **Performance & hygiene:** Give every `<img>`, `<video>`, and `<iframe>` explicit `width`/`height` or `aspect-ratio`. Never lazy-load the hero image and set `fetchpriority="high"`. No render-blocking third-party scripts in `<head>`. Never report unmeasured Lighthouse/Web Vitals scores. Never implement CSS/UI changes via external string-replace patch scripts.
- **No em-dashes in UI copy:** Never use em-dashes or en-dashes in UI prose. Use commas, periods, colons, or parentheses.

## 3. UI Craft & 9-Pass Order

Core philosophy: **Quiet chrome, rich moments.** Every major visual choice (color, font, layout, spacing, cards, icons, motion) must have a 1-line reason; technique without purpose is slop. Apply passes in order:

1. **Spacing:** Use a 4px grid (2px nudges inside small controls allowed). Equal siblings share identical height, padding, and gap. Gaps inside a group must be smaller than gaps between groups. Align icons, labels, and numbers cleanly in columns. Remove arbitrary values like `mt-[13px]` or `py-[11px]`.
2. **Color:** Build from one tinted neutral ramp matching the World + 3 text roles (primary, secondary, muted) + 1 deliberate accent used sparingly (key CTA, active selection, key figure). Remove default purple/blue hue gradients, gradient text, colored glows, radial background blobs, and neon borders. Use hairline borders (primary text at 6-10% opacity). Keep glassmorphism and glow off by default (if justified by brand, cap at 1-2 elements max). Pick light or dark theme from brand and audience, never because "dark looks tech".
3. **Icons:** Remove all emoji from UI chrome, headings, buttons, and labels. Use one consistent line icon set (16-18px, 1.5 stroke, text-role color, fixed icon box width) only where genuinely relevant. Drop decorative AI cliches (sparkle, robot, rocket, magic, lightning).
4. **Copy:** State specifically what the product does for whom. Remove exclamation marks, greeting headlines (`Welcome back!`), trailing periods on short labels/buttons, generic CTAs (`Get Started`, `Learn More`, `Try Now`), and AI buzzwords (`seamless`, `revolutionary`, `supercharge`, `next-generation`, `AI-powered`). Cut AI rhythm tells: forced rule of three, negative parallelism (`not just X, it's Y`), temporal cliches (`In today's fast-paced world`), mechanical Title Case in bullets, and theatrical closers.
5. **Typography:** Choose 1 interface family + at most 1 partner (mono for figures/meta, or display serif for hero headlines only) based on brand character. Create hierarchy with size and color, using weights 400-500 (600 max for rare emphasis; avoid 800-900 headings). Use sentence case labels (no wide-tracked ALL CAPS). No negative letter spacing under 16px, no italic for emphasis, and `tabular-nums` with one consistent number format.
6. **Layout:** Structure sections from real content needs, never default AI templates (3-step "How It Works", 3-column pricing with "Most Popular", generic logo bar, bento mosaic, fake terminal, 4-column boilerplate footer). Match section variety to the `RHYTHM` dial (`1` uniform, `2` balanced breaks, `3` asymmetric/varied). Avoid all-centered stacks unless the hero is short with no visual. Compose above-the-fold without dead empty bands, with at most 1 primary + 1 secondary action.
7. **Details:** Use nested radii (`inner = outer - padding`, minimum 4px): small tags 4-6px, inputs/buttons 8-10px, cards 12-16px, panels/modals 14-20px (not everything a pill). Replace glowing `PRO`/`New`/`Beta` capsule pills with quiet mono text or remove them. Cut eyebrow pills that repeat the H1, decorative pulsing dots, and meaningless colored left stripes. Use subtle neutral shadows only where elevation matters.
8. **Visuals:** Remove glossy 3D blobs, orbs, nebulas, stock grids, and generic illustrations. Show real product UI, real photography, or one concrete visual from the product's world definable in one sentence. Blend image edges cleanly into the page background.
9. **Motion:** Match the `MOTION` dial (`1` hover/press only, `2` purposeful transitions/reveals, `3` choreographed). Use one easing curve `cubic-bezier(0.22, 1, 0.36, 1)` (120-180ms feedback, 300-500ms entrances). Transition only `color`, `background`, `border`, `opacity`, and `transform` (never `transition-all` or layout properties). Remove `hover:scale` card bounce and endless `animate-pulse`/`animate-ping` on non-live elements.

### Starter Reference Tokens

Use existing brand tokens first; otherwise start from these tinted neutral ramps:

| Role | Light Graphite | Light Warm | Light Ink | Dark Graphite | Dark Ink |
| --- | --- | --- | --- | --- | --- |
| Page bg | `#fafafa` | `#f7f4ee` | `#f5f7fa` | `#141415` | `#0b0d14` |
| Card | `#ffffff` | `#fdfbf7` | `#ffffff` | `#19191b` | `#11141c` |
| Raised | `#f4f4f5` | `#efe9df` | `#eceff4` | `#232325` | `#1a1e28` |
| Text primary | `#171717` | `#1f1b16` | `#111827` | `#ededed` | `#eef0f5` |
| Text secondary | `#525252` | `#5e554a` | `#4b5565` | `#a1a1a6` | `#a3a9b8` |
| Text muted | `#737373` | `#7b7266` | `#6b7487` | `#85858b` | `#7a8296` |

## 4. Lean Engineering Discipline

Write the smallest complete change that solves the problem without breaking existing flows:

- **Scope before coding:** Read the code you touch and trace affected callers, exports, config, and tests. Check what could break for users. Extra unrequested features are out of scope.
- **Smallest Complete Change Ladder** (stop at the first rung that fully works):
  1. Does it need to exist? Skip unrequested options/flexibility and name what was skipped in 1 line.
  2. Already in this codebase? Reuse existing helpers, components, and patterns.
  3. Standard library or native platform feature? Use it (unless the project has its own component).
  4. Installed dependency? Use it; never add a new package for a few lines of logic.
  5. Readable 1-liner? Write it (skip clever unreadable one-liners).
  6. Minimum clean code that works.
- **Code rules:** Deletion beats addition. No speculative wrappers, abstractions, config flags, or "for later" boilerplate. For bug fixes, check all callers and fix the root cause once in shared code. Preserve existing validation and error handling when moving code. Between equal-size options, pick the edge-case-safe one.
- **Shortcut tracking:** Mark any deliberate simplification with a known limit using `shortcut: <limit>, <when to upgrade>`.
- **Comment hygiene:** Never add ASCII separator banners, obvious code restatements, step-by-step narration, or decorative emoji comments. Comment only the non-obvious *why* in 1 line (2 max if adding a second distinct fact).
- **Never cut:** Validation at trust boundaries, error handling preventing data loss, security, accessibility, or explicit user requirements.
- **Verification check:** New non-trivial logic (branches, loops, parsers, money, auth/security) must include one focused test or self-check.

## 5. Delivery Gate (Run Before Delivering)

Output a concise `PASS / FAIL` summary backed by concrete evidence (if the environment cannot run a browser/build, state that plainly and verify via code inspection):

- **Hard Gates:** Contrast verified (AA), keyboard + `:focus-visible`, `cursor: pointer` + native semantics, mobile reflow + 44px tap targets, zero dead controls/links, zero fake stats/testimonials/claims, zero em-dashes in UI text, media sized properly.
- **Purpose & Liveliness:** Major visual decisions justified in 1 line; `ENERGY/RHYTHM/MOTION` dials matched; one focal point, one deliberate accent, and the signature motif present; zero leftover slop.
- **Template Check:** If the brand name and logo were swapped for another business, would this screen still clearly belong only to this product? If not, push the copy, layout, or signature further.
- **Lean & Risk Check:** Confirm shortest working diff with zero unrequested bloat, plus 1-2 closing lines on what was skipped/not checked and any remaining risk.

---

*Credits: Adapted from [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir, CC BY 4.0), [anti-slop](https://github.com/miqdadbadjuber/anti-slop) by Miqdad Badjuber (MIT), and [ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert (MIT).*