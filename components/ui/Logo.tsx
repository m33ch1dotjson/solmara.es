/*
 * The mark, inline rather than an <img>, so it inherits `currentColor` and can be
 * tinted by whatever surrounds it. Traced from the supplied artwork as arcs of one
 * constant width.
 */
export function Logo({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 976 976"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="85">
        <path d="M 394.5 148 A 176.5 176.5 0 0 0 747.5 148" />
        <path d="M 219 148 A 350 350 0 0 0 488 488 A 350 350 0 0 1 757 828" />
        <path d="M 218.5 828 A 173.5 173.5 0 0 1 565.5 828" />
      </g>
    </svg>
  );
}
