# KK PREMIUM VISUAL DIRECTION — PHASE 0 LOCK

**Status:** direction lock. No layouts, no IA, no product structure changes.
**Purpose:** the contract every primitive and every later phase must follow.
**Grounded in:** `src/design-system.css` (654 lines, the sole token authority).

---

## 0. The one-line brief

> Khabo Kothay is an **editorial food-culture product about Dhaka**, not a delivery
> app and not a SaaS dashboard. Warm printed paper, espresso ink, saffron used
> like a pen and not like paint. It should feel *composed*, the way a good
> restaurant guide feels composed — calm, confident, and specific.

Everything below follows from one distinction: **KK is discovery, not
transaction.** Delivery apps are fast, bright, pill-shaped and loud because
they optimise for a completed order. KK optimises for *confidence in a
decision*. That is a slower, quieter, more typographic register.

### What "not AI-generated" means operationally

Generated interfaces fail in five identifiable ways. Each rule in this document
exists to close one of them.

| tell | closed by |
|---|---|
| Many near-identical sizes (`1rem`, `1.02rem`, `1.05rem`, `1.1rem`…) | §1 — the scale is **closed** |
| Every corner the same radius | §2 — radius carries **role**, not decoration |
| One brand colour applied everywhere | §3 — colour carries **job**, not identity |
| Effects applied because they're available (glass, gradients, blur) | §4 — four glass surfaces, named |
| Motion that performs rather than responds | §5 — no bounce, no entrance choreography |

---

## 1. TYPOGRAPHY PERSONALITY

**Two voices, and they never blur.** Newsreader (serif) is the *editorial
voice* — it speaks about restaurants. Manrope (sans) is the *interface voice* —
it helps you operate the product. A serif heading over sans body is the oldest
signal in publishing that something was edited rather than emitted.

### Heading style — Newsreader

| level | size token | weight | line-height | tracking |
|---|---|---|---|---|
| Mega (one per page, max) | `--fs-mega` | 700 | `0.94` | `--tracking-tight` |
| Display | `--fs-display` | 700 | `1.0` | `--tracking-tight` |
| h1 | `--fs-h1` | 600 | `--lh-tight` | `--tracking-snug` |
| h2 | `--fs-h2` | 600 | `--lh-tight` | `--tracking-snug` |
| h3 | `--fs-h3` | 600 | `--lh-snug` | **`0`** |
| h4 | `--fs-h4` | 600 | `--lh-snug` | **`0`** |

**The optical rule that matters:** negative tracking is for large type only. At
h3 and below, tightening a serif closes its apertures and the text gets muddy
rather than refined. Tracking returns to `0` at h3. This single rule is most of
the difference between typography that was set and typography that was
configured.

`font-optical-sizing: auto` is the browser default for a variable font and
Newsreader ships the `opsz 6..72` axis, so optical sizing is already working —
we declare it explicitly in Phase 1 to document the intent, not to change
rendering.

### Body style — Manrope

- `--fs-body` (0.9375rem) / `--lh-body` (1.62) / weight 400 / tracking `0`.
- Long-form prose: `--lh-loose` (1.75), width capped at `--container-text` (62ch).
- `text-wrap: pretty` on paragraphs, `balance` on headings — both already set.

### UI text style — Manrope

- Controls and labels: `--fs-md` / `--fs-sm`, weight 500–600, tracking `0` to `+0.01em`.
- **Never negative tracking on UI text.** Interface text is read in glances, not
  in lines; tightening it costs legibility and buys nothing.
- Micro-labels and eyebrows: `.t-label` — `--fs-2xs`, weight 700, `--tracking-caps`
  (0.14em), uppercase. Wide tracking is what makes a tiny label read as
  deliberate rather than as small text.
- **All numerals in prices, counts, ratings and stats use `.t-num`** (tabular
  figures). Proportional figures in a price column is one of the most visible
  amateur tells in a restaurant product, and it costs one class to avoid.

### The italic word — KK's typographic signature

`.t-voice` (Newsreader italic, weight 500, tracking 0), optionally with
`.t-spice` for gold. **One word per headline. One headline per section.**
This is the brand's single most recognisable typographic move; its power is
entirely a function of scarcity. Two italic gold words in one view and the
device is dead.

### Hierarchy rules

1. **Three ranks visible at once, maximum**: one display moment, one section
   rank, one body rank. A fourth competing size is where "generated" creeps in.
2. **The scale is closed.** Eleven steps, `--fs-mega` → `--fs-2xs`. If a design
   needs a size that isn't in the scale, the design is at the wrong step. No new
   sizes, no literal `font-size` values in new code.
3. **Weight before size.** To promote something, change weight or colour first;
   reach for a larger size only when the hierarchy genuinely has a new level.
4. Every heading owns its body copy. Heading → its own text is a **tight** gap;
   block → next block is a **loose** gap. See §6.

### Spacing rhythm (type-led)

Vertical rhythm derives from the text, not from a uniform grid:

- Heading → its own lede: `--s3` (12px)
- Lede → its content: `--s6` (24px)
- Content block → next block: `--s12` (48px)
- Section → section: `--section-y` family

**Equal gaps are the failure mode.** When the space above and below a heading
matches, the heading floats free of its content and the page reads as a stack of
unrelated cards — which is exactly how generated pages read.

---

## 2. SHAPE LANGUAGE

### Two conflicts resolved first

- `--card-radius` (20px) vs `--r-card` (18px) both exist. **18px wins**; it was
  the later, more considered decision and it sits correctly against a 14px
  control nested inside it. `--card-radius` becomes an alias so no consumer breaks.
- Seven radius steps for eight roles guarantees arbitrary choices. **Six are in
  active service**; `--r-lg` (20) and `--r-2xl` (36) are retained as tokens for
  legacy consumers but are **closed to new use**.

### Radius carries role, not size

| role | radius | reasoning |
|---|---|---|
| Chips, filters, toggles, moods, avatars | `--r-full` | Transient, plural, multi-select. Pills are the native shape of "many of these, pick some." |
| **Buttons** (all intents) | **`--r-md` 14px** | Committing to an action. Must not look like a filter. |
| Inputs, selects, textareas | `--r-md` 14px | Matches buttons so a form reads as one fabricated object. |
| Cards | `--r-card` 18px | Holds content; marginally softer than the controls inside it. |
| Modals, sheets, drawers | `--r-xl` 28px | Floats above everything. **Largest radius = highest layer.** |
| Media inside a card | `--r-sm` 10px | Nested shapes must be tighter than their parent. |
| Badges, tags, inline marks | `--r-xs` 6px | Typographic, not interactive. |
| Sections, ink bands, table rows, full-bleed media | `0` | Architecture, not objects. |

### Two mechanical rules

1. **Nesting rule — a child's radius is always ≤ its parent's.** A 14px control
   inside an 18px card inside a 28px sheet. Violating this is what produces the
   "bubble inside a bubble" look, and the rule catches it without judgement calls.
2. **Layer rule — radius increases with elevation.** Flat content 0, cards 18,
   overlays 28. Radius becomes a depth cue instead of decoration.

### ⚠ DECISION TO CONFIRM — buttons move from pill to 14px

Today every `.btn` computes `border-radius: 999px` (`refine.css:238`, a
deliberate choice documented as "the radius is what stops it reading as a form
control"). I am recommending reversing it, for three reasons:

1. **Shape currently carries no information.** Buttons and chips are both
   999px, so the eye cannot distinguish "commit to this" from "narrow this
   list" without reading. That is a hierarchy failure, and hierarchy is the
   stated goal.
2. **Pills are delivery-app language.** Foodpanda, Swiggy, Uber Eats, and most
   food apps in the region are pill-heavy. KK's differentiator is that it is
   editorial, not transactional; the shape should say so.
3. **A pill fights Newsreader.** A serif headline with tight negative tracking
   over a bubbly capsule button is two registers in one view. A 14px rectangle
   is architectural and calm, and sits with the typography instead of against it.

Chips, moods and filters **keep** `--r-full` — that is what makes the
distinction legible.

**Cost:** ~215 button call sites, but all reached through the `Button` primitive
and one token, so it is a one-line change and a one-line revert. **Confirm or
veto before Phase 2.**

---

## 3. COLOUR USAGE RULES

The existing role separation is the best thing in the design system and is
**preserved exactly**: ink = action, gold = emphasis, emerald = verification.
Colour carries a *job*, never an identity. Two clarifications and one reversal.

### Where each material lives

**KK ink / espresso** — the action colour and the atmospheric ground.
- Primary buttons on paper.
- The ink canvas bands: hero, offers, closing principles (`--grad-canvas`).
- Nav once scrolled past the hero.
- **Never a card.** Cards are content and content sits on paper.

**Warm neutrals (paper 50–300)** — the default world.
- `--bg` (paper-100) page ground, `--surface` (paper-50) for cards raised off it,
  `--surface-2` (paper-200) for recessed wells and inactive segments.
- Hairline `--border` + `--shadow-card` + `--ring-inset` — that inset highlight
  is what gives a card a "printed edge" rather than a flat fill.

**Gold / saffron** — emphasis, used like a pen.
- Eyebrows, rules, rank numerals, one italic word, small marks, the focus ring.
- **Resolved contradiction:** the system says gold is "never a surface," but
  `.btn--accent` fills with `--grad-spice`. The rule becomes: **a filled gold
  action is permitted once per view, and only for a commercial/value action** —
  claim an offer, redeem a reward. Never for navigation, never for a generic CTA.
  Gold that appears three times per screen is decoration; gold that appears once
  is a recommendation.
- **On ink grounds gold becomes both emphasis and action** (`--on-ink-primary`),
  because ink cannot be the action colour on ink. Already correct — keep.

**Light surfaces** — every card, panel, list row, and form.

**Glass** — four surfaces only, see §4.

**Emerald** — verification only. `--success`, `--prov-verified*`. **Untouchable.**
Green means "we checked this," and nothing else. This is a trust rule, not a
style rule.

**Indigo** — vibe/mood tagging only. Noting honestly: `vibes` coverage in the
live catalogue is empty, so indigo currently has almost no live surface. Do not
design around it and do not invent uses for it.

### Button treatment by context

The brief said not to force one treatment. The rule is contextual:

| context | treatment |
|---|---|
| On paper — the one real action | Ink fill, **flat**, `--shadow-primary` |
| On paper — secondary | Ghost: `--surface` + `--border-strong`, ink-soft label |
| On paper — tertiary | Subtle: transparent, ink-soft label |
| On the ink canvas | **Inverted** — paper fill, ink label (ink-on-ink is invisible) |
| On photography / the map | Glass — `--glass-ink` + hairline + paper label |
| Commercial / value action | Gold fill, **once per view** |
| Destructive | `--danger` label on `--danger-soft`. **Never a red fill** — a red fill in a hospitality product reads as an error state, not as a choice. |

### ⚠ Gradients: remove them from buttons

`--grad-primary` puts a visible 135° espresso gradient on every primary button.
Gradient-filled buttons are among the strongest generated-UI signals in current
design practice. **Primary buttons become flat `--primary`** with the warm
`--shadow-primary` doing the lifting.

`--grad-primary`, `--grad-ink`, `--grad-canvas` are **kept for large ink
surfaces** — at the scale of a hero band a gradient reads as *light in a room*,
which is atmospheric and correct. At the scale of a 44px button the same
gradient reads as a style preset. Scale decides.

---

## 4. GLASS / MATERIAL RULES

Glass is chrome. Content is never glass.

### One recipe, not five

`--glass-blur` (`saturate(160%) blur(14px)`) and `--header-blur`
(`saturate(180%) blur(20px)`) are two recipes for one material. **Converge on
`saturate(170%) blur(16px)`**; `--header-blur` becomes an alias.

### The four permitted surfaces

1. The fixed header, once it sits over content.
2. The mobile bottom nav.
3. The refine sheet / drawer.
4. Controls floating on photography or the map.

That is the complete list. **Cards never blur** — it costs a composite layer,
lowers text contrast, and a card is content rather than chrome. **Ink bands
never blur** — blurring near-black returns near-black, so the cost is real and
the effect is nil.

### Three requirements when glass is used

- **Saturation boost is mandatory.** An unsaturated blur over warm paper
  desaturates toward grey and the material reads dead. The `saturate()` is what
  keeps glass warm.
- **Always a hairline edge** — `--border-soft` on paper, `--on-ink-line` on ink.
  Glass without a defined edge looks like a rendering artefact.
- **A `@supports` fallback is required**, raising background alpha to ~0.96.
  Without it the nav becomes unreadable text floating on photography wherever
  `backdrop-filter` is unavailable.

### Budget

**Two composited glass layers at once, maximum.** The refine sheet over the
glass header already spends both.

---

## 5. MOTION PERSONALITY

**KK moves like a person who knows the room.** It does not announce, it does not
bounce, and it never makes you wait for it. Motion exists to explain what
changed and to confirm that you were heard.

### What may animate

`transform`, `opacity`, `filter`, and colour on small elements. **Nothing else.**
No `width`, `height`, `top`, `left`, or `margin` transitions — they force layout
and they are the difference between smooth and janky on a mid-range Android.

### Duration by distance, not by importance

| what | duration |
|---|---|
| State change in place (hover, press, colour) | `--dur-fast` 160ms |
| Element moving under ~100px (disclosure, dropdown) | `--dur-med` 260ms |
| Overlay, sheet, or dialog entering | `--dur-slow` 420ms |
| Scroll reveal only | `--dur-slower` 680ms |

### Easing by direction

- **Arriving** → `--ease-out` (decelerate). Confident arrival.
- **Leaving** → `--ease`, at one step shorter duration. **Things should leave
  faster than they arrive** — this asymmetry is most of what makes an interface
  feel responsive instead of sluggish.
- **Moving in place** → `--ease-in-out`.

### ⚠ Retired from the vocabulary

- **`--ease-spring`** (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — overshoot.
- **`@keyframes kk-pop`** — `scale(0.92)` → `1.03` → `1`.

Both stay defined for their existing consumers, both are **closed to new use**.
Bounce and overshoot are the loudest "startup app" signal available and they
directly contradict *calm, elegant, confident*. Nothing in a restaurant guide
should spring.

### Entrance vocabulary — two members

`kk-fade-in` and `kk-rise` (14px). Scroll reveal rises 18px. **Never scale from
small** (a zoom-in entrance reads as a notification, not as content) and **never
slide from off-screen** (it implies the content came from somewhere it didn't).

### Six standing rules

1. **Nothing animates on first paint above the fold.** No hero choreography.
   The page is *there* when you arrive; it does not assemble itself for you.
2. **Press feedback survives `prefers-reduced-motion`.** A press answers input
   rather than decorating it — reduced motion removes decoration, not feedback.
   (`polish.css:1291` already argues this; it becomes the system rule.)
3. **Hover is a bonus, never the mechanism.** Every hover affordance needs a
   non-hover equivalent, because more than half of this product's traffic has no
   hover at all.
4. **Stagger caps at ~8 items / ~40ms step.** Beyond that the last item arrives
   late enough to read as a bug. (`ExplorePage`'s `STAGGER_CAP` already does this.)
5. **The focus ring never animates.** It must appear the instant the key lands.
6. **Scroll reveal is one-shot, below-the-fold only, and never re-hides.**

### Free win already in the codebase

`design-system.css:630-654` defines the complete `[data-reveal]` contract —
`pending`/`shown` states, `--reveal-delay`, a `prefers-reduced-motion` opt-out,
and content visible by default so it can never be trapped hidden. It documents a
`useReveal` hook that **does not exist**. Phase 4 builds that hook
(~20 lines, `IntersectionObserver`) against a contract that is already written,
already safe, and already tokenised.

---

## 6. SPACING & RHYTHM

- **4px grid.** `--s1`…`--s24` only. No literal spacing values in new code.
- **Nesting decreases:** section (`--section-y`) → block `--s12` → group `--s6`
  → item `--s3` → inline `--s2` → hairline `--s1`. A child's gap is always
  smaller than its parent's.
- **Type-led vertical rhythm** — see §1. Tight above content it owns, loose
  between blocks.
- **Section cadence:** alternate `--section-y-sm` / `--section-y` /
  `--section-y-lg` so the page has rhythm rather than a metronome (already the
  documented intent at `design-system.css:259`).
- **Containers:** `--container` 1200 default; `--container-narrow` 720 for prose;
  `--container-wide` 1400 for the map/atlas only.
- **Optical alignment:** eyebrows and gold rules align to cap-height, not to the
  bounding box. Small detail, disproportionate effect.
- **Touch:** 44px minimum target, 8px minimum between adjacent targets.

---

## 7. ONE FOCUS SYSTEM

Two exist today: the global `:focus-visible` (2px saffron outline, 3px offset,
`design-system.css:492`) and the `--focus-ring` token (a double paper +
`--primary-bright` box-shadow, 12 consumers).

**The saffron outline is the system.** It was chosen and contrast-measured to
work on *both* the paper and ink grounds, which the ink-based ring cannot do.
`--focus-ring` is **redefined** to the saffron equivalent so all 12 existing
consumers converge without touching a single call site.

**Text controls joined the system in Phase 2c, and use `:focus`, not
`:focus-visible`.** Every field control now takes `outline: var(--focus-ring)`
with a 2px offset. Both prior field designs used an espresso ring, so neither
was §7's. The pseudo-class differs from the rest of the product on purpose:
`:focus-visible` exists to answer *was this keyboard-driven?*, and that
question has no bearing on an input that is about to receive typing — a diner
who taps into a field still needs to see which field will get their words.

---

## 8. ICON SYSTEM

Lucide stays. It is not replaced; it is made consistent.

**Stroke.** One weight, set once as a context default in `main.tsx` and
mirrored in `server-entry.tsx`: `<LucideProvider strokeWidth={1.75}>`.
Lucide draws on a 24px grid at stroke 2, and the measured reality was 137
of 137 icons on the homepage at stroke 2 while being *displayed* at 12–16px
— where 2px is ~13% of the icon box, heavier than the 500/600 Manrope
beside it. That is why the icons read as louder than the text they label.
1.75 matches the UI weight. Any icon may still override it.

**Size ladder — five steps, and that is the whole vocabulary.**

| step | for |
|---|---|
| 12 | inline typographic marks inside a badge, tag or meta line |
| 14 | the default: icons inside body and UI text |
| 16 | icons that label a control — buttons, inputs, list rows, nav |
| 18 | a section-leading icon, or the hero search |
| 20 | a brand mark in chrome (navbar, footer, console) |

Nothing else is chrome. **30 / 34 / 36 / 40 are exempt** — those are
compositional marks, where the icon *is* the element rather than a label
attached to one (empty states, feature plinths, the auth-page brand at 26).
An icon at a non-ladder chrome size is a bug, not a nuance: 13 distinct
steps were measured across 411 elements, and eight of them existed only
because someone nudged a single instance.

**Sizing belongs on the element, not in CSS**, so the size is visible where
the icon is read. Where CSS already sizes an `svg` descendant (nine rules in
`console.css`, one in `editorial.css`), it must still land on the ladder.

**Alignment.** An icon in a text run needs `flex: none` so it cannot be
squeezed by a long label, and it aligns on the text baseline — not the line
box centre. Decorative icons take `aria-hidden="true"`; an icon that is the
only content of a control needs an accessible name on the control.

---

## 9. WHAT THIS DOCUMENT DOES NOT CHANGE

Layouts, page structure, information architecture, routing, data flow,
provenance and trust rules, the emerald verification family, the hero scene, the
Explore scene, filtering and matching logic, or any product copy.

---

## 10. DECISIONS — CONFIRMED 2026-08-26

All five were approved. Recorded here as the settled basis for Phases 1–5.

| # | decision | scope | landed in |
|---|---|---|---|
| 1 | Buttons pill (999) → `--r-md` 14px; chips stay pill | `.btn` + 7 bespoke buttons | `refine.css`, `editorial.css`, `polish.css`, `phase-c.css`, `explore-scene.css` |
| 2 | Primary buttons flat `--primary` instead of `--grad-primary` | `.btn--primary`, `.nav__cta`, `.disc__ask-refine`, `.atlas__btn`, `.atlas__go`, `.rf__done` | same |
| 3 | Gold fill limited to one commercial action per view | `.btn--accent` usage | `editorial.css` |
| 4 | `--ease-spring` and `kk-pop` closed to new use | new code only | `design-system.css` §8 |
| 5 | `--card-radius` → 18px, `--glass-blur`/`--header-blur` converged | token aliases | `design-system.css` §9 |

Two things were done under decision 2 that go past its literal wording, both
listed here so they are easy to reverse:

- **`.btn--accent` was flattened too**, not just `.btn--primary`. The old
  `--grad-spice` ramp started at saffron-600, where white text measures
  **3.55:1** — below the 4.5:1 AA threshold. The flat fill is saffron-700 at
  **4.88:1**. Reverting the flatten reinstates the contrast failure.
- **Five bespoke buttons outside the `.btn` class** carried
  `--grad-primary` and a pill. Left alone they would have been the only
  gradient pills left on paper pages, i.e. decision 1 would have created a
  new inconsistency rather than removing one.

Chips, moods, toggles, progress bars, avatars, brand marks and the large
gradient bands (`.why-khabo`, `.wallet-hero`) keep their pills and gradients —
those are the roles §2 and §3 assign them.

### Still open (not part of the five)

| item | why it is deferred |
|---|---|
| 12 glass surfaces vs §4's list of 4 | needs a glass audit before any are demoted; **one closed in 2a** — the card action cluster's inline recipe is now `.kk-ib--glass`, so 11 remain |
| `useReveal` | Phase 4; the `[data-reveal]` CSS contract already exists, the hook does not |
| `.nav__burger` declared in four files | same disease `.btn` had; untangling belongs with Navbar work in Phase 3 |
| `.chip--remove` is **entirely dead** with 3 live call sites (`ProfilePage.tsx:290/342/368`) | pre-existing, not caused by 2b: editorial's later `.chip` shorthand takes its background, border, colour, `gap: 2px` and `padding-right`. Reviving it would *change* ProfilePage's appearance, so it goes with Phase 3's signed-in areas rather than into a chip phase |
| `phase3.css:690`'s soft `.chip--active` | also already dead before 2b, beaten by editorial's later `.chip--active`; same Phase 3 sweep |
| ~11 bespoke search / wrapper input families | `.input-wrap`, `.disc__ask-input`, `.hero__search-input`, `.nav__search input`, `.menu-search input`, `.pref-picker__search input`, `.filter-group select`, `.disc__sort select`, `.admin-price-input`. Phase 2c left every one alone: in these the *wrapper* owns the box — border, radius, height, focus — and the inner `input` is deliberately bare, so it is a different control, not a `Field` in disguise. Absorbing them would force one style where it harms usability |
| `.field` call sites not yet migrated to `Field` — LoginPage (3), PartnersPage (4), ProfilePage (1) | they need no edit to benefit: primitives.css §6 styles `.field` and `.kk-field` identically, so all eight already take the unified 44px / 14px / saffron-focus paint. Only the a11y wiring waits, and that arrives when Phase 3 touches those pages anyway |
| `/discover`'s cuisine index — the one disclosure Phase 2d did **not** migrate | there is no panel to own. The rows it reveals are its own *siblings* inside `.dsc-cuisines`, capped by a `nth-child(n+9)` rule at ≤820px rather than shown by a container, so becoming a `Disclosure` would mean restructuring the list — which §9 forbids. What it was actually missing was the wiring, and that it got: the list has an id and the button has `aria-controls`, verified resolving to it |
| `ExecutiveAdminPage`'s menu-review row expander | the trigger is inside a `<tr>` and the panel is the next `<tr>`. Wrapping either in `Disclosure`'s `<div>` breaks table semantics, which is a worse outcome than four heights was. Logged in 2d, left alone deliberately |
| three `aria-expanded` controls with no `aria-controls`, measured after 2d — a combobox `input`, `.nav__burger` and `.hero__search-input` | none is a disclosure: they are a combobox, a navigation sheet and a search popover, so their wiring is `aria-owns` / `aria-activedescendant` / focus trapping rather than a panel id. Phase 2e |

Closed since this table was written:

- **An error message that was not red** — Phase 2c. `--error` was consumed by
  four rules (`.field__error`, `.admin-status--rejected`, `.toast--err svg`,
  and the field system) and **defined nowhere**. An undefined custom property
  with no fallback is invalid at computed-value time, and for an inherited
  property like `color` the declaration is dropped and the value becomes
  `inherit` — so three of the four rendered in the surrounding body ink.
  Proven live with a sentinel parent of `rgb(1,2,3)`: the "errors" came back
  `rgb(1,2,3)`. All four now use `--danger`, measured `rgb(143,47,28)`, and
  `rulesStillUsingUndefinedErrorToken: 0`.
- **One class rendering two designs** — Phase 2c. `.field` resolved to a 10px
  radius / 14px type / `--border-strong` control on public pages and a 14px
  radius / 13px type / `--border` control inside `.admin`, `.profile-body` or
  `.auth-card`, switched by nothing but an ancestor. The scoping in
  `console.css` §9 had to be **deleted**, not overridden: at (0,2,1) no
  single-class rule in a later file can reach it. Its micro-caps `> label`
  design was dead on arrival — all 34 fields are `<label class="field">`
  wrapping a `<span class="field__label">` — and `.admin-shell` appears in
  zero markup. `deadLabelRules: 0` after.
- **Gradient selected states on chips and moods** — Phase 2b. `.disc__mood--on`,
  `.rf__opt--on` and both `--primary` hero chips are flat, measured at
  **`gradientsLeftInChips: 0`**, which closes decision 2 completely: no
  chip-sized gradient fill is left in the product. On a 34px chip over a
  photograph the ramp never read as a ramp anyway — it resolved to one muddy
  value and the shadow was doing all of the separating, so the glow stays and
  only the ramp went.
- **`@supports` fallback for `backdrop-filter`** — the codebase had zero
  `@supports` blocks and §4 makes one mandatory. The first one now exists, on
  `.kk-ib--glass` in `primitives.css`. Every glass surface added from here
  inherits the obligation, and one working example to copy.
- **Icon size ladder, 13 steps → 5** — Phase 1b, done.
- **Disclosures that announced "expanded" and named nothing** — Phase 2d. Three
  of the four carried `aria-expanded` with no `aria-controls`, and the FAQ
  marked a collapsed panel `aria-hidden` while leaving it in the tab order —
  hidden from the screen reader, still reachable by keyboard. **4 of 4 now name
  what they control, up from 1 of 4**, and every collapsed panel is either
  `hidden` or `inert`. Underneath it: four trigger heights (37.05 / 46 / 54 /
  61.98px) became 36+44 / 46 / 52.83 / 61.98, which retires the one disclosure
  trigger in the product that sat under the 44px floor.

---

## 11. THE PRIMITIVE LAYER

Sections 1–8 are rules. This is where the rules are *kept*, so that a rule
about a control is applied once rather than re-applied at every call site.
`src/components/ui/` holds the primitives; `src/primitives.css` holds their
paint and is loaded **last** in `main.tsx`.

### Why last

A primitive is the system answer for a control, so it should not lose a tie
to a page-era file that happens to sit lower in the import list. Source order
gives it the tie; specificity still beats it, which is the point — a page that
genuinely needs to differ has to say so with a compound selector in its own
namespace, and that makes the exception visible instead of accidental. There
is exactly one so far: `.rf__head .rf__close` keeps the refine sheet's close
button a visibly ringed circle, because it is the only way out of a sheet that
covers the results.

### What each primitive is for

| primitive | it exists because | ladder it owns |
|---|---|---|
| `Button` | `.btn` was declared in **four** files — 27 top-level rules — so the shipped button was the resolved value of all of them and no single file described it | 44 / 52px min-height, `--r-md`, `CONTROL_ICON = 16` |
| `IconButton` | the same control shipped at 34 / 34 / 40 / 30 / 28px and **none** reached 44px, on 633 instances on `/explore` alone | 28 / 34 / 40px box, 14 / 16 / 18px mark, 44px **target** |
| `Chip` | pressable chips shipped at **eight** heights (24/29/32/33/34/35/35/36px), none reached 44px, and ~108 of them carried `touch-action: auto` — the 300ms double-tap-zoom delay on the two densest control surfaces in the product | 36 / 32px box, 44 / 40px **target**, 14 / 12px mark |
| `Badge` | a *label* was wearing a control's clothes: `.chip--meal` on a `<span>` is the same 999px pill as the toggles beside it, so nothing but moving the cursor told you which pills were answers and which were questions | 24 / 28px box, `--r-xs`, 11 / 12px mark, five tones |
| `Field` | `aria-describedby`, `aria-invalid` and `htmlFor` stood at **zero occurrences product-wide** across 34 fields, so a hint was text near a box and an error was text near a box — neither was attached to the control it described. Alongside that, one `.field` class rendered two designs and the error colour resolved to body ink | 44px control min-height, `--r-md`, `--fs-md` type, 16px at ≤640, `--s2` label gap |
| `Disclosure` | **three of the four disclosures never said what they controlled.** Only the homepage's principle rows carried `aria-controls`, so on the FAQ, the hero's Advanced pill and `/discover`'s cuisine index a screen reader announced "expanded" and gave no way to reach the thing that expanded. Underneath that: four trigger heights (37.05 / 46 / 54 / 61.98px), three radii, four type treatments, three focus treatments, and four different mechanisms for taking a panel away | 44px trigger min-height, `MARKER_ICON = 16`, one saffron ring; **appearance stays per-variant** |
| `Dialog` | ten surfaces claimed `role="dialog"`, seven of them `aria-modal="true"`, and **not one trapped focus** — Tab walked straight out of the panel into the page behind it. Each also re-implemented the same two effects, and **two of them read `document.body.style.overflow` wrongly**, so opening one modal from inside another could leave the page unscrollable for good. Underneath that: three scrims (45% / 94% / 45% at z 200 / 80 / 75), four panel widths (420 / 440 / 520 / 960), four title treatments — two of them a bare `<h2>` inheriting `--fs-h2`, up to **40px** of page lettering inside a 520px box — and a compare modal at z 75 sitting *below* the navbar account menu at z 80 | one scrim, z **90**, 440 / 560 / 960 width ladder, `--fs-h4` title, `--r-lg`, 88dvh cap; **appearance stays per-variant** |

### The rule the icon button adds to §2

**A control's visual box and its pointer target are two different things.**
The box is whatever the layout can afford; the target is 44px and is carried
by an invisible `::after` sized `max(100%, var(--kk-ib-reach-x/y))`. Reach is
two properties, not one, because the axes have different room: a *column* may
only take half its gap on each side before neighbouring targets overlap and
the wrong button answers a tap, while the axis it is not stacked on is free.
Where 44px is genuinely unreachable, the rule says so in a comment with the
measurement — a documented shortfall, not a silent miss.

The chip narrows that rule rather than repeating it: **reach only the axis that
has room to spare.** `.kk-chip` takes `width: 100%` and only stretches its
height, because a chip *is* its label and is therefore already 70px+ wide —
horizontal reach would take from the chip beside it and buy nothing. And 36px
is not a taste call. Both wrapping chip rows in the product (`.rf__opts`,
`.disc__moods`) use `gap: 8px`, and **36 + 8 = 44**: the target can take its
full floor, and two rows' targets then meet at exactly zero overlap. Measured
at 375px in the refine sheet, three wrapped rows, `reachOverlap: 0` on both
boundaries. One pixel more of box and every row boundary would have had a band
where the wrong option answers a tap.

### The rule the chip and badge add to §2

**`--r-full` means pressable; `--r-xs` means read-only.** §2's radius table
already assigned `--r-xs: 6px` to "badges, tags, inline marks (typographic,
not tappable)"; nothing in the product obeyed it, because the only way to get
saffron was `.chip--meal` and that came with a pill attached. Now shape carries
the press/read distinction the same way it started carrying the button/chip
distinction when buttons left 999px — and `Badge` enforces it by construction:
a `<span>`, no cursor, no hover, no `::after` target, no pressed state. Those
absences *are* the component.

Tones are named for **ramps, not domains** — `accent`, `vibe`, `success`,
`warn`, not `meal`, `offer`. Domain naming is exactly what put a Google
attribution mark in `.chip--meal`: it wanted saffron, and saffron had only one
name.

### The rules the field adds to §2 and §7

**The invalid state lives on the wrapper, not on the control.** `Field` puts
`kk-field--invalid` on the `<label>` and lets it reach the control from there.
An error is rarely only about the border: the message, the label and — later —
an icon all change with it, and a class on the input can style none of them. One
truthy `error` prop is therefore the single switch for the border, the red
message, `aria-invalid` and `aria-describedby` together, so the visible state
and the announced state cannot drift apart.

**A label is a `<label>` wrapping its control, so `htmlFor` never has to be
right.** The zero `htmlFor` occurrences could have been fixed with generated
ids on both ends; wrapping needs no id at all and cannot be wired wrong. Ids
are still generated with `useId`, but only for the hint and the error, which
have no wrapping equivalent.

**Text controls take `:focus`, not `:focus-visible`** — the reason is in §7.

**Field controls go to 16px at ≤640px.** iOS Safari zooms the page when a
focused input's font-size is under 16px, and the zoom does not undo itself: the
diner is left on a shifted layout mid-form. This is the one place in the product
where a type size is set by a browser behaviour rather than by §1's ladder, so
the media query says so in a comment. Not verifiable on-device from here.

### The rules the disclosure adds to §2, §5 and §7

**A primitive may own behaviour without owning appearance.** This is the first
one that does, and it is not a compromise. The four surfaces are a bordered
card on a paper page, a ruled row on an ink band, a pill inside dark glass and
a button under a list whose rows are its own siblings. Giving them one look
would be §9's forbidden move — forcing one style where it harms the surface —
so `Disclosure` converges the *pair* instead: the ids, `aria-expanded` **with**
`aria-controls`, the 44px trigger, the saffron ring, the marker and its
rotation, and how a panel is taken away. `variant` carries the rest, and a
call site keeps its own paint by passing `className` / `panelClassName`. What
this buys is measurable and was measured: **4 of 4 disclosures now name what
they control, up from 1 of 4.**

**`hidden` is the default way to take a panel away; `inert` is the exception
that pays for animation.** `hidden` removes a panel from the layout, the tab
order and the accessibility tree in one attribute, with no measurement and no
transition. `animate` opts into a height transition, and a height cannot be
transitioned on a panel that is not in the DOM — so the panel stays, and then
it *must* be `inert`. The FAQ shipped the wrong half of exactly this: a
collapsed panel marked `aria-hidden` and left focusable, which hides the answer
from a screen reader and still lets the keyboard land inside it. `aria-hidden`
and `inert` are not two spellings of the same intent.

**One saffron ring, on ink as well as paper.** The principle rows used
`2px solid var(--on-ink-accent)` at a 4px offset and were the *best* of the
four; they still lose it, because §7's whole argument for saffron over the
espresso ring it replaced was that saffron works on both grounds. Measured
rather than assumed: `--accent` `#c87309` against the `--espresso-900` ink
canvas is **5.01:1**, well clear of the 3:1 floor a non-text mark needs.

**The offset is negative on the card variant only**, and for a mechanical
reason rather than a stylistic one: the card sets `overflow: hidden` to clip
its animated panel, and that clips an outline drawn outside the border box
too. Inset is the only offset that survives it.

**The marker inherits inside a pill and takes its own colour everywhere
else.** On a card or a row the marker is a faint mark beside a heading. Inside
the `inline` pill it is part of the pill, and the pill has one colour that its
hover, its open state and any ground override move together — a `--ink-faint`
marker there would put a paper grey inside the hero console's glass.

**Under reduced motion the rotation stays and only its transition goes.** The
chevron still ends at 180°, instantly. That angle is the control's state, not
an ornament on it, and removing it would answer a request for less motion with
less information.

### The rules the dialog adds to §2, §5 and §7

**Behaviour may come from a library; appearance may not.** `Dialog` is the one
primitive with a dependency behind it — `@radix-ui/react-dialog`, approved for
this and nothing else, used only inside this wrapper, never imported by a page.
The reason it earned an exception is that the defect was not stylistic: a focus
trap, `hideOthers`, and a scroll lock that survives being opened twice are three
things that are easy to write badly and were, ten times. Measured after
migration: **6 of 6 dialogs trap focus, up from 0 of 9.** Everything the wrapper
paints is in `primitives.css` §8 — there is no width, no colour and no radius in
the component file, and `Dialog.test.tsx` asserts that by checking the size
ladder arrives as a class and that `--kk-dialog-w` never appears in a `style`
attribute.

**Three things the wrapper does that Radix does not.** It *returns focus
itself*, because Radix's `onCloseAutoFocus` restores to a `Dialog.Trigger` and
KK has none — every dialog here is opened by an existing product control. The
element to come back to is captured **during the render that opens the dialog**,
not in an effect: child effects run before the parent's, so by the time a parent
effect fires, Radix's focus scope has already moved focus into the panel and
`document.activeElement` is the wrong answer. It renders *in place, with no
`Portal`*, which keeps the nav drawer's z 70/71 relationship with the bar intact
and — the reason it matters more — keeps `renderToStaticMarkup` output empty
while closed, so the 219-route prerender is unchanged. And for `variant="media"`
it adds an explicit `event.target === event.currentTarget` check, because that
Content *fills the viewport*: a press on the dark ground is inside it, and
Radix's outside-dismiss correctly never fires.

**Centring is `inset: 0; margin: auto`, never a transform.** A `transform`
creates a containing block for `position: fixed` descendants, so a
`translate(-50%, -50%)` panel would silently re-root anything fixed inside it —
and the media variant has four absolutely-positioned controls in it. `margin:
auto` needs a non-`auto` height to resolve against, which is what `height:
max-content` is for. Verified at 1386×954: a 960px panel landed at left 213 /
right 1173, exactly `(1386 − 960) / 2`.

**The head and the foot are pinned; the body is the only scroller.** The price
history and compare dialogs previously scrolled the whole panel, so the title of
the thing you were reading left the screen first. `--kk-dialog-gut` and
`--kk-dialog-pad` carry the ≤640 step-down in one place, replacing three
per-site `width: 92%/96%` rules and one bespoke padding override in
`editorial.css`. Verified at 375px: both custom properties resolve to 12px and
the panel takes `100vw − 24`.

**The dialog is the one place an animation is cancelled outright rather than
shortened.** §5's global blanket lives in `editorial.css` and only zeroes
`animation-duration`, which still *runs* the panel's 6px rise — at zero duration
that is a jump, not a movement, and a jump is more motion than none. §9 of
`primitives.css` therefore sets `animation: none` on both scrim and panel.
Verified in the pane, which reports `prefers-reduced-motion: reduce`:
`animationName` is `none` on both. The corollary is that the entrance itself is
**unverified live** — the pane cannot turn the preference off.

**`aria-modal` is absent on purpose.** Radix marks every sibling
`aria-hidden="true"` via `hideOthers()` instead, which is the more reliable of
the two and was confirmed in the pane: with the drawer open, the header carried
`aria-hidden="true"` and lost it on close. Seven of the ten surfaces this
replaces asserted `aria-modal="true"` while hiding nothing and trapping nothing —
the attribute was the claim, not the behaviour.

### The rule primitives.css's position adds to §5

**A primitive that moves must carry its own `prefers-reduced-motion` opt-out.**
This follows from "why last" and getting it wrong is silent. There is no
`@layer` here, so at equal specificity a later file's *unconditional* rule
beats an earlier file's *media query*. The opt-outs `explore-scene.css` and
`phase-c.css` already hold for `.disc__mood`, `.rf__opt` and `.rcard__act`
therefore **cannot reach** `.kk-chip:hover` or `.kk-ib:hover`. Migrating a call
site onto a primitive silently takes the reduced-motion promise away from it
unless the primitive restates it. `primitives.css` §7 does, for both chip and
icon button — which also closes retroactively the gap `.kk-ib` shipped with in
2a. The 1px hover lift is what gets suppressed; the `:active` press does not,
because a press is feedback for something the person just did, not motion
happening at them.

### What a primitive may not do

- Name a meaning. A toggle's "on" colour is the caller's (`--kk-ib-on-bg`): a
  heart is terracotta, a save espresso, a comparison the vibe accent.
- Take an icon size from the call site. It takes the *component* and sizes it.
- Let an icon-only control ship without an accessible name. `label` is
  required, so a missing `aria-label` is a compile error rather than an audit
  finding.
- Announce a toggle's state only when it is on. `Chip` states `aria-pressed`
  unconditionally, including `false`; omitting it when off makes the control
  read as a plain button most of the time, and the whole point of a chip row is
  that you can hear which ones are already answering the question.
- Silently drop what it was given. `Field` clones exactly one child to wire it;
  hand it two and both render untouched, unwired, rather than the second one
  disappearing. The escape hatch is visible in the output instead of being a
  mystery, and it is asserted in `Field.test.tsx`.
- Put an instruction inside the question. "(optional)" belonged to neither the
  label text nor the hint, so `optional` is a prop and renders as a quiet
  lowercase mark — the label stays the thing a screen reader says first.

### How a primitive's wiring is proven

There is no DOM test environment in this repo — no jsdom, no testing-library,
40 pure-logic suites under `environment: 'node'` — and the three pages `Field`
migrated are all behind auth, so the preview pane renders none of them
(`/apply` returned `kkFieldCount: 0`). `Field.test.tsx` therefore asserts the
markup through `react-dom/server`'s `renderToStaticMarkup`: nine tests covering
`aria-invalid`, hint and error ids, both-at-once ordering, a caller's own
`aria-describedby` being preserved rather than replaced, the nothing-to-describe
case adding no attributes, and the `optional` / `labelHidden` / multi-child
paths. **Zero new dependencies** — which is the reason this route was chosen
over a test renderer.

The saffron focus outline is the one 2c claim the pane cannot measure:
programmatic `.focus()` does not produce `:focus` matching there, and returned
the CSS initial state (`outline: 3px none rgb(28,23,16)`, offset `0px`) with
`document.activeElement` correct. It was verified instead against the served
stylesheet — `fetch('/src/primitives.css')`, status 200 — which returns the
focus block intact. Note that a CSSOM sweep is *not* a substitute: only 11 of
13 sheets are readable in the pane and primitives.css is one of the two that
are not, so `document.styleSheets` reports zero `kk-field` rules while
computed style proves they apply.

`Dialog.test.tsx` follows the same route for the same reason, with one addition
worth naming: **`aria-labelledby` cannot be asserted there.** Radix emits it only
once `Title` has registered its presence, and it registers in a
`useLayoutEffect`, which never runs under `renderToStaticMarkup`. The attribute
is correct in the browser and absent from every assertion in the file; it was
checked in the pane instead, where the drawer, the compare dialog and the photo
viewer each resolved their `aria-labelledby` to the right text. What the 13 tests
*do* pin is the half that must not drift: an empty string while closed, scrim
before panel, the size ladder as a class, slot order, no empty boxes, and that
`bare` emits no `kk-dialog` class at all while still carrying `role="dialog"`
and an accessible name.

### Migration policy

Call sites migrate **when a phase already has reason to touch them**. The 128
existing `.btn` markup sites compute identically through the class contract,
so rewriting them wholesale is churn with a regression budget and no user-
visible gain.

`.icon-action` — the console's 32px square table-row action — was listed here as
a control that stays separate "on purpose; it is coherent and unbroken". Phase 3
found it neither. It was coherent in isolation and wrong in two ways that only
show up next to the rest of the product: a 32px box on a ladder that has no 32px
step, and a 32px *pointer target* on a page whose every other control meets 44.
The primitive grew `shape="square"` instead of the class staying, because the
only genuine difference was the corner: circles at seven-per-row read as a
string of beads. The nine sites are migrated and the class is deleted.

Four of the ten `role="dialog"` surfaces deliberately did **not** migrate, and
the reasons are structural rather than scheduling:

- **`RefineDrawer`** is always mounted and transitioned on `visibility`, with a
  documented two-`requestAnimationFrame` focus dance that Radix's focus scope
  would fight. Making it a `Dialog` means making it conditional first, which is
  a behaviour change, not a wiring one.
- **`ConsoleShell`** is a navigation landmark that never claimed to be a dialog.
  It is not modal and should not become modal.
- **`MatchIndicator`** is a hover-opened non-modal popover. It got the cheap half
  of the fix instead: `aria-haspopup="dialog"` had promised a popup and named
  nothing, so the trigger now carries `aria-controls` — emitted only while the
  popover exists, because `aria-controls` pointing at nothing is worse than none.
- **`MapView`'s `.atlas__card`** is an inline preview inside the map, not a layer
  over it.
