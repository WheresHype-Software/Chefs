/** A seal with a tick: marks the team-verified "Chef" title. */
export function VerifiedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 2.5 14.6 4.4 17.8 4.3 18.8 7.4 21.4 9.3 20.4 12.3 21.4 15.4 18.8 17.3 17.8 20.4 14.6 20.3 12 22.2 9.4 20.3 6.2 20.4 5.2 17.3 2.6 15.4 3.6 12.3 2.6 9.3 5.2 7.4 6.2 4.3 9.4 4.4Z" />
      <path d="m8.5 12.3 2.4 2.4 4.6-5" />
    </svg>
  );
}
