# Ryot - Design Language

**"RYOT // UPRISING"** - an aggressive esports-editorial look. Near-black canvas
with film grain, massive condensed poster type, an angular "notch" signature, and
oversized mono stats. The point of view: a stats terminal that reads like a fight
poster, not a generic dashboard.

The wordmark always splits **RY** (gold) + **OT** (bone) - gold for Ryan.

---

## Color

Tokens live in `apps/web/tailwind.config.ts` (Tailwind classes) and are mirrored
as CSS variables in `apps/web/app/globals.css` (for inline `style` / CSS usage).

| Token      | Hex       | Use                                         |
| ---------- | --------- | ------------------------------------------- |
| `bg`       | `#0a0a0b` | App canvas (true near-black, slightly warm) |
| `surface`  | `#100f12` | Panels / cards                              |
| `surface2` | `#17161a` | Insets, inputs, item slots                  |
| `line`     | `#26242b` | Hairline borders / dividers                 |
| `bone`     | `#f4f1e8` | Primary text (warm off-white, not cold)     |
| `muted`    | `#a39d92` | Secondary text                              |
| `faint`    | `#6a655e` | Tertiary / captions                         |
| `gold`     | `#c8aa6e` | The accent - wordmark, focus, active        |
| `gold2`    | `#ecd197` | Hover/bright gold                           |
| `win`      | `#4d8df0` | Victory / win-rate ≥ 50%                    |
| `loss`     | `#ff4d4d` | Defeat / win-rate < 50%                     |
| `ink`      | `#0a0a0b` | Text on gold/colored fills                  |

Discipline: striking comes from **scale, contrast, type and texture** - not from
piling on colors. Gold is the only accent; red is reserved for losses/destructive.

### Texture & light

- **Film grain**: a fixed SVG `feTurbulence` overlay (`body::after`, ~4.5% opacity,
  `mix-blend: overlay`). This is what kills the flat, "AI-coded" plastic feel.
- **Spotlight**: layered radial gradients on `body` - a warm gold wash from top,
  a faint blue from the top-right.

---

## Type

Three faces, loaded via `next/font/google` in `app/layout.tsx`:

- **Anton** (`--font-display`) - the voice. Huge, condensed, UPPERCASE poster
  headlines (hero, champion names, VICTORY/DEFEAT, rank). Tracking `-0.04em`.
- **Space Grotesk** (`--font-sans`) - UI / body / buttons. Quirky geometric
  grotesque; deliberately _not_ Inter.
- **Space Mono** (`--font-mono`) - every stat, label, kicker and chip. Monospace
  uppercase with wide tracking gives the "terminal / scoreboard" texture. Stats
  use `.stat` (tabular-nums).

Rule of thumb: **headlines = Anton, labels = mono, prose = Grotesk, numbers = mono.**

---

## Signature shapes

- **Notch** (`.notch` / `.notch-sm`): a clip-path that cuts the top-right and
  bottom-left corners (a hexagon-derived bevel). Reserved for **solid fills** -
  primary buttons and active segments - since clip-path also clips borders.
- **Hairlines, not rounding**: panels are sharp rectangles with 1px `line`
  borders (`rounded-none`). The collapsing-border grid (negative `-mt-px -ml-px`)
  gives the editorial "spec sheet" feel on the home feature list.
- **Marquee ticker**: a slow scrolling strip of mono labels under the top bar -
  esports broadcast energy and an instant signal that the design is intentional.

---

## Components (in `globals.css`)

| Class                         | What it is                                             |
| ----------------------------- | ------------------------------------------------------ |
| `.card` / `.card-hover`       | Sharp hairline panel; hover lifts border to gold       |
| `.btn-primary`                | Gold fill, ink text, **notched**, uppercase bold       |
| `.btn-outline`                | Gold hairline → fills gold on hover                    |
| `.btn-ghost`                  | Neutral hairline, used for secondary actions           |
| `.field`                      | Sharp input/select; gold border on focus               |
| `.chip`                       | Mono uppercase tag (role/rank/patch/shards)            |
| `.seg` / `.seg-active`        | Segmented toggle; active is notched gold               |
| `.kicker`                     | Section label: mono uppercase + gold tick (`::before`) |
| `.eyebrow`                    | `// LABEL` mono lead-in above hero                     |
| `.marquee` / `.marquee-track` | Scrolling ticker                                       |
| `.stat`                       | Mono tabular numerals for all stats                    |
| `.rule-gold`                  | Hairline gold→transparent rule (footer)                |

### Motion

- `riseIn` - pages fade + rise on load (fast, eased).
- `marquee` - continuous ticker scroll.
- `blink` - the wordmark cursor `_` and the live status dot.

Keep motion subtle and purposeful; no decorative bouncing.

---

## Principles

1. **Big or quiet.** A headline is enormous (Anton) or it's a small mono label.
   Avoid medium, mushy "card title" sizes.
2. **One accent.** Gold carries identity; outcomes use win/loss. Don't introduce
   new hues.
3. **Sharp by default, notched for emphasis.** Rounding reads as generic; the
   notch is the brand.
4. **Numbers are mono, always.** Stats line up and feel precise.
5. **Texture over gradients.** Grain + hairlines beat soft glows.
