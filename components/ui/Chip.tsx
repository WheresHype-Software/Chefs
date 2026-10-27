import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { pressed?: boolean };

/** Toggle chip; `pressed` drives both the look and aria-pressed. */
export function Chip({ pressed, className = "", ...props }: Props) {
  return <button type="button" className={`chip ${className}`} aria-pressed={pressed} {...props} />;
}
