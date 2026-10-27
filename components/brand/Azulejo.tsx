import { useId } from "react";

export type AzulejoVariant = "cobalt" | "glaze" | "yolk";

const COLORS: Record<AzulejoVariant, { ground: string; motif: string; accent: string }> = {
  // cobalt motif on white glaze, the classic kitchen tile
  glaze: { ground: "#ffffff", motif: "#1d4aa1", accent: "#1d4aa1" },
  // white motif on cobalt
  cobalt: { ground: "#1d4aa1", motif: "#ffffff", accent: "#ffffff" },
  // cobalt tile with an ochre heart, from older polychrome panels
  yolk: { ground: "#1d4aa1", motif: "#ffffff", accent: "#f0b429" },
};

/**
 * One pattern tile, drawn as SVG. Quarter circles sit in the corners so that neighbouring
 * tiles complete each other into rings, the way a "padrão" wall reads from across the room.
 */
function Motif({ variant }: { variant: AzulejoVariant }) {
  const c = COLORS[variant];
  return (
    <g>
      <rect width="100" height="100" fill={c.ground} />
      {/* corner quarter-circles: full rings appear where four tiles meet */}
      {[
        [0, 0],
        [100, 0],
        [0, 100],
        [100, 100],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="24" fill={c.motif} />
          <circle cx={x} cy={y} r="34" fill="none" stroke={c.motif} strokeWidth="3" />
          <circle cx={x} cy={y} r="10" fill={c.ground} />
        </g>
      ))}
      {/* central four-petal flower */}
      <g transform="translate(50 50)">
        {[0, 90, 180, 270].map((r) => (
          <path key={r} d="M0 -6 C 10 -14, 10 -28, 0 -34 C -10 -28, -10 -14, 0 -6 Z" fill={c.motif} transform={`rotate(${r + 45})`} />
        ))}
        <circle r="7" fill={c.accent} />
        <circle r="3" fill={c.ground} />
      </g>
      {/* edge half-diamonds tie the tiles together along the grout */}
      {[
        [50, 0, 180],
        [50, 100, 0],
        [0, 50, 90],
        [100, 50, 270],
      ].map(([x, y, r]) => (
        <path key={`${x}-${y}`} d="M-8 0 L0 -9 L8 0 Z" fill={c.motif} transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </g>
  );
}

/** A single square tile that fills its container. */
export function AzulejoTile({ variant = "glaze", className = "" }: { variant?: AzulejoVariant; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} aria-hidden="true">
      <Motif variant={variant} />
    </svg>
  );
}

/** A field of repeating tiles, for bands and backgrounds. `size` is the tile size in px. */
export function AzulejoField({
  variant = "cobalt",
  size = 96,
  className = "",
}: {
  variant?: AzulejoVariant;
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`block h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <pattern id={`az-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <Motif variant={variant} />
          </svg>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#az-${id})`} />
    </svg>
  );
}

/** The brand mark: four tiles meeting at a ring. */
export function TileMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#1d4aa1" />
      <circle cx="12" cy="12" r="6.5" fill="#fff" />
      <circle cx="12" cy="12" r="3" fill="#f0b429" />
      <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}
