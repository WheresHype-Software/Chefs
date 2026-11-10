import type { ReactNode } from "react";

export type LumiMood = "ola" | "dica" | "pensar" | "festa" | "ups" | "espera";

/** Per mood: the handle's angle, how big the flame burns, and how rosy the cheeks are. */
const POSE: Record<LumiMood, { arm: number; flame: number; cheeks: number }> = {
  ola: { arm: -30, flame: 1, cheeks: 0.75 },
  dica: { arm: -12, flame: 1, cheeks: 0.75 },
  pensar: { arm: 0, flame: 1, cheeks: 0.75 },
  festa: { arm: -40, flame: 1.3, cheeks: 0.85 },
  ups: { arm: 14, flame: 0.7, cheeks: 0 },
  espera: { arm: 16, flame: 0.55, cheeks: 0.6 },
};

const EYE_WHITES = (
  <>
    <ellipse cx="88" cy="108" rx="11" ry="13" fill="#ffffff" />
    <ellipse cx="122" cy="108" rx="11" ry="13" fill="#ffffff" />
  </>
);

/** Pupils looking at (dx, dy) from the middle of the eye. */
function pupils(dx: number, dy: number, r = 6) {
  return (
    <>
      <circle cx={88 + dx} cy={108 + dy} r={r} fill="#142033" />
      <circle cx={122 + dx} cy={108 + dy} r={r} fill="#142033" />
      <circle cx={90 + dx} cy={105 + dy} r="2" fill="#ffffff" />
      <circle cx={124 + dx} cy={105 + dy} r="2" fill="#ffffff" />
    </>
  );
}

const FACE: Record<LumiMood, ReactNode> = {
  ola: (
    <>
      <g className="lumi-blink">
        {EYE_WHITES}
        {pupils(2, 3)}
      </g>
      <path d="M94 128 Q105 140 116 128" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </>
  ),
  dica: (
    <>
      <g className="lumi-blink">
        {EYE_WHITES}
        {pupils(4, -3)}
      </g>
      <path d="M97 129 Q105 136 113 129" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </>
  ),
  pensar: (
    <>
      <g className="lumi-blink">
        {EYE_WHITES}
        {pupils(-3, -4)}
      </g>
      <circle cx="110" cy="133" r="5" fill="none" stroke="#ffffff" strokeWidth="3.5" />
    </>
  ),
  festa: (
    <>
      <path d="M77 110 Q88 98 99 110" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M111 110 Q122 98 133 110" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M91 124 Q105 150 119 124 Z" fill="#0d2459" />
      <ellipse cx="105" cy="137" rx="6" ry="3.5" fill="#ff9b8a" />
    </>
  ),
  ups: (
    <>
      <path d="M77 92 L97 87" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <path d="M133 92 L113 87" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <g className="lumi-blink">
        <ellipse cx="88" cy="109" rx="11" ry="12" fill="#ffffff" />
        <ellipse cx="122" cy="109" rx="11" ry="12" fill="#ffffff" />
        <circle cx="89" cy="112" r="5.5" fill="#142033" />
        <circle cx="121" cy="112" r="5.5" fill="#142033" />
        <circle cx="91" cy="109" r="2" fill="#ffffff" />
        <circle cx="123" cy="109" r="2" fill="#ffffff" />
      </g>
      <path d="M93 134 Q99 128 105 134 Q111 140 117 134" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
  espera: (
    <>
      <path d="M77 108 Q88 117 99 108" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M111 108 Q122 117 133 108" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M99 132 Q105 136 111 132" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
};

/** What floats around her: a "!" for a tip, a "?" while thinking, sparkles, a sweat drop, "Zz". */
const EXTRAS: Partial<Record<LumiMood, ReactNode>> = {
  dica: (
    <>
      <circle cx="200" cy="38" r="17" fill="#ffffff" stroke="#dde4ef" strokeWidth="2" />
      <path d="M200 28 V41 M200 47 V48" stroke="#1d4aa1" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  pensar: (
    <>
      <circle cx="184" cy="36" r="17" fill="#ffffff" stroke="#dde4ef" strokeWidth="2" />
      <circle cx="160" cy="58" r="5" fill="#ffffff" stroke="#dde4ef" strokeWidth="2" />
      <path
        d="M178 30 Q178 23 184 23 Q190 23 190 29 Q190 34 184 36 V39 M184 44 V45"
        stroke="#1d4aa1"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  festa: (
    <>
      <path d="M36 22 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#f0b429" />
      <path d="M168 22 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="#f0b429" />
      <path d="M20 74 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#1d4aa1" />
    </>
  ),
  ups: <path d="M158 84 Q166 96 158 102 Q150 96 158 84 Z" fill="#9ed0ff" />,
  espera: (
    <>
      <path d="M160 34 H174 L160 50 H174" stroke="#1d4aa1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path
        d="M182 14 H192 L182 26 H192"
        stroke="#1d4aa1"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity=".6"
      />
    </>
  ),
};

/**
 * Lumi, the Ao Lume mascot: a frying pan with a flame on her head that burns brighter when she
 * celebrates and dwindles when something is wrong. Decorative by default (the words beside her
 * carry the meaning); pass `label` when she stands alone. Motion lives in globals.css and stops
 * under prefers-reduced-motion.
 */
export function Lumi({
  mood = "ola",
  size = 120,
  animated = false,
  label,
  className,
}: {
  mood?: LumiMood;
  size?: number;
  animated?: boolean;
  label?: string;
  className?: string;
}) {
  const pose = POSE[mood];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={(size * 210) / 240}
      viewBox="0 0 240 210"
      className={`${animated ? "lumi-on" : ""} ${className ?? ""}`}
      {...a11y}
    >
      <ellipse className="lumi-shadow" cx="105" cy="194" rx="70" ry="8" fill="#142033" opacity=".14" />
      <g className="lumi-bob">
        <rect x="80" y="156" width="18" height="30" rx="9" fill="#12306e" />
        <rect x="114" y="156" width="18" height="30" rx="9" fill="#12306e" />
        <g transform={`rotate(${pose.arm} 182 111)`}>
          <path
            className={mood === "ola" ? "lumi-wave" : undefined}
            d="M180 104 L226 88 Q234 85 236 92 Q238 99 230 101 L184 118 Z"
            fill="#12306e"
          />
        </g>
        <ellipse cx="105" cy="124" rx="77" ry="46" fill="#12306e" />
        <ellipse cx="105" cy="113" rx="80" ry="49" fill="#1d4aa1" />
        <ellipse cx="105" cy="115" rx="66" ry="39" fill="#163b86" />
        <path d="M54 104 Q62 86 88 80" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".18" />
        {mood === "dica" && <circle cx="105" cy="38" r="30" fill="#f0b429" opacity=".22" />}
        <g transform={`translate(105 60) scale(${pose.flame}) translate(-100 -66)`}>
          <g className="lumi-flame">
            <path
              d="M100 14 C114 29 119 42 115 55 C111 67 89 67 85 55 C82 46 87 37 93 32 C94 39 97 43 101 44 C98 35 97 26 100 14 Z"
              fill="#f0b429"
            />
            <path d="M100 38 C106 45 107 52 104 58 C102 62 97 62 95 58 C93 53 96 47 100 38 Z" fill="#ffe29a" />
          </g>
        </g>
        {EXTRAS[mood]}
        {FACE[mood]}
        {pose.cheeks > 0 && (
          <>
            <ellipse cx="72" cy="126" rx="8" ry="5" fill="#ff9b8a" opacity={pose.cheeks} />
            <ellipse cx="138" cy="126" rx="8" ry="5" fill="#ff9b8a" opacity={pose.cheeks} />
          </>
        )}
      </g>
    </svg>
  );
}
