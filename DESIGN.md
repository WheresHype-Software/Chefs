# Ao Lume — design system ("azulejo de cozinha")

The visual world is the tiled wall of a Portuguese kitchen or tasca: white glaze, cobalt pattern, grout lines, and the ochre that appears in older polychrome panels. Food photography supplies the warmth. The interface stays precise and quiet; the tiles carry the identity.

## Colour (tokens in `app/globals.css`)

| Role        | Token                        | Value                       | Use                                                                                     |
| ----------- | ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Text        | `ink` / `ink-2` / `ink-3`    | #142033 / #26324a / #37435c | Headings, body, secondary body                                                          |
| Muted text  | `muted`                      | #535e76                     | Metadata and placeholders (6.5:1 on white, 6.0:1 on paper)                              |
| Faint       | `faint`                      | #7a849a                     | Disabled states only (3.75:1, below the text minimum)                                   |
| Glaze       | `glaze`                      | #ffffff                     | Page ground, panels                                                                     |
| Paper       | `paper`                      | #f3f6fb                     | Secondary surfaces, search band                                                         |
| Grout       | `line` / `line-2` / `line-3` | #dde4ef / #ccd6e5 / #b3c0d4 | Gaps between tiles, borders, rules                                                      |
| Cobalt      | `cobalt`                     | #1d4aa1                     | Primary actions, selection, the pattern, the how-it-works band                          |
| Cobalt deep | `cobalt-deep`                | #12306e                     | Hover, footer                                                                           |
| Cobalt soft | `cobalt-soft`                | #e4ecf8                     | Selected nav, available days, portraits                                                 |
| Yolk        | `yolk` / `yolk-soft`         | #f0b429 / #fdf3d6           | Rating stars, text selection, the one warm tile, notices. Never for body text on white. |

Strategy: committed cobalt on a white glaze ground. Cobalt owns whole regions (tile walls, the how-it-works band, the footer), not scattered accents. Light theme only, chosen for daytime and evening phone browsing of food photography.

## Type

One family, **Schibsted Grotesk** (400–900), self-hosted through `next/font`.

- Display (`.d`): 700, tracking −0.025em; hero 800 at −0.035em, `clamp(38px, 4.6vw, 64px)`, line-height ~1.
- Section titles: `clamp(28px, 3.4vw, 40px)`.
- Body 16–18px, line-height 1.55, measure ≤ 62ch.
- Small text 13–15px, sentence case. No tracked uppercase labels, no italic display.

## The tile

`components/brand/Azulejo.tsx` draws the pattern as SVG: corner quarter-circles that complete into rings where four tiles meet, a four-petal centre, and half-diamonds on the edges.

- `AzulejoTile variant="glaze" | "cobalt" | "yolk"`: one square tile.
- `AzulejoField`: a repeating wall (footer band, chef invitation).
- `TileMark`: the brand mark beside the lowercase wordmark "ao lume".
- `Photo` falls back to a tile when an image is missing or fails, so the page never shows a broken image.

## Composition

- **Home hero:** a tile wall (8 columns on desktop, 6 on tablet, 3 on phone) with a white panel set into it, holding the headline, one explanatory paragraph and the search. Photo tiles alternate with pattern tiles; exactly one yolk tile.
- **Search** is the primary action everywhere: where / what / when, then `/procurar`.
- **Results:** 1/2/3-column grid of `ChefTile` (4:3 photo, tier pill, name, rating, area and distance, services, starting price).
- Sections: generous vertical space (80–96px), tight internal groups.

## Components

Buttons: cobalt fill, sentence case, 600 weight, 6px radius; outline variant on white. Chips: pill-shaped, cobalt when selected. Fields: bordered, 6px radius, cobalt focus ring. Boxes: 10px radius, grout border. Photos: 10px radius; wall tiles 3px.

## Motion

One authored moment: the hero tiles "set" into the wall (fade and scale from 0.94, staggered 45ms, 0.6s, `cubic-bezier(0.16, 1, 0.3, 1)`). Elsewhere only feedback: hover zoom on photos (1.03, 500ms), colour transitions (≤ 200ms). No scroll reveals. Everything respects `prefers-reduced-motion`.

## Avoid

Kicker labels above headings; section numbers that do not carry an order; hairline-ruled editorial layouts; italic serif display; cream backgrounds; gradient text; emoji as icons; invented testimonials or figures.
