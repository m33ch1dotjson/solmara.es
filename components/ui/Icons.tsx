/*
 * The navigation icons.
 *
 * Hand-drawn on a 24 grid in one weight, because a whole icon library for seven
 * glyphs is a dependency we would be carrying for a decade. They inherit the row's
 * colour through currentColor, so the active row's icon turns accent with its label.
 *
 * Every one is aria-hidden: the label next to it already says what the row is, and a
 * screen reader announcing "house, Properties" is noise.
 */

function Glyph({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Overview: four panels, the shape of a dashboard. */
export function IconOverview() {
  return (
    <Glyph>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </Glyph>
  );
}

/** Clients: two people, because a client is rarely one person alone. */
export function IconClients() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17.5 14.9c1.9.6 3.2 2.3 3.2 4.6" />
    </Glyph>
  );
}

/** Properties: a roof over a door. */
export function IconProperties() {
  return (
    <Glyph>
      <path d="M3.5 10.2 12 3.5l8.5 6.7" />
      <path d="M5.5 11.8v8.7h13v-8.7" />
      <path d="M10 20.5v-5h4v5" />
    </Glyph>
  );
}

/** Procedures: a clipboard with steps on it. */
export function IconProcedures() {
  return (
    <Glyph>
      <rect x="4.5" y="4.5" width="15" height="16" rx="2.5" />
      <path d="M9 4.5V3.2h6v1.3" />
      <path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4" />
    </Glyph>
  );
}

/** Documents: a folder. */
export function IconDocuments() {
  return (
    <Glyph>
      <path d="M3.5 6.5a2 2 0 0 1 2-2h3.2l2 2.5h7.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </Glyph>
  );
}

/** Tasks: something ticked off. */
export function IconTasks() {
  return (
    <Glyph>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.3l2.6 2.6 4.6-5.2" />
    </Glyph>
  );
}

/** Settings: sliders, which read as settings faster than a cog at 18px. */
export function IconSettings() {
  return (
    <Glyph>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="10" cy="16" r="2.2" />
    </Glyph>
  );
}
