// Line icons for the chef page (24px grid, currentColor), one per section and fact.
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  "aria-hidden": true,
} as const;

export const ICONS = {
  person: (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  menu: (
    <svg {...base}>
      <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2 1.5-3 4-3 7v3h3" />
    </svg>
  ),
  camera: (
    <svg {...base}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  star: (
    <svg {...base}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  ),
  wallet: (
    <svg {...base}>
      <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4zM4 7V5h12v2M16 13h4" />
    </svg>
  ),
  award: (
    <svg {...base}>
      <circle cx="12" cy="9" r="5" />
      <path d="m9 13.5-1 7.5 4-2 4 2-1-7.5" />
    </svg>
  ),
  pin: (
    <svg {...base}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  euro: (
    <svg {...base}>
      <path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9" />
    </svg>
  ),
  bag: (
    <svg {...base}>
      <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  clock: (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  instagram: (
    <svg {...base}>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg {...base} strokeWidth={2.4}>
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  ),
};

export type IconName = keyof typeof ICONS;
