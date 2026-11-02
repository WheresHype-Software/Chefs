// Each letter's flight when the pan flicks, like vegetables being sautéed. The pan pivots at the
// handle (right), so letters near the front lip are thrown highest and travel furthest back
// towards the handle. They leave on the flick with a slight front-to-back ripple (STAGGER).
// A space keeps its place.
const LETTERS = [
  { ch: "a", h: 22, dx: 8 },
  { ch: "o", h: 20, dx: 7 },
  { ch: " " },
  { ch: "l", h: 18, dx: 6 },
  { ch: "u", h: 17, dx: 5 },
  { ch: "m", h: 15, dx: 4 },
  { ch: "e", h: 13, dx: 3 },
];
const STAGGER = 0.03;

/**
 * Animated logo: the "ao lume" wordmark (same type as the static logo) sits in a frying pan that
 * sautés the letters: the pan's flick throws them, they flip through the air and are caught as
 * the pan dips, then a pause (styles in globals.css, .pan-logo).
 */
export function PanToss() {
  let order = 0;
  return (
    <span className="pan-logo" role="img" aria-label="ao lume">
      <span className="pan-logo-pan" aria-hidden="true">
        <span className="wordmark flex text-[22px] leading-none text-ink">
          {LETTERS.map((l, i) =>
            l.ch === " " ? (
              <span key={i} className="w-[0.28em]" />
            ) : (
              <span
                key={i}
                className="pan-logo-letter"
                style={{ "--h": `${-(l.h ?? 0)}px`, "--dx": `${l.dx}px`, animationDelay: `${order++ * STAGGER}s` } as React.CSSProperties}
              >
                {l.ch}
              </span>
            ),
          )}
        </span>
        <svg className="pan-logo-svg" viewBox="0 0 110 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 1h82a1.5 1.5 0 0 1 0 3H2a1.5 1.5 0 0 1 0-3z" />
          <path d="M4 4h78l-3 5.5a4 4 0 0 1-3.5 2H10.5a4 4 0 0 1-3.5-2z" />
          <path d="M85 1.5l22-2.5a2 2 0 0 1 .5 4L86 5z" />
        </svg>
      </span>
    </span>
  );
}
