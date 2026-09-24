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

/** Invoices: a document with an amount ruled off at the bottom. */
export function IconInvoices() {
  return (
    <Glyph>
      <path d="M5.5 3.5h9.2l3.8 3.8v13.2H5.5z" />
      <path d="M14.5 3.5v4h4" />
      <path d="M8.6 11.5h6.8M8.6 14.5h6.8" />
      <path d="M12.4 17.6h3" />
    </Glyph>
  );
}

/** Help: a question in a circle, drawn in the same weight as the rest. */
export function IconHelp({ size = 18 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.5" />
      <path d="M12 17.2h.01" />
    </Glyph>
  );
}

/** Workspace: the office the portal belongs to. */
export function IconWorkspace() {
  return (
    <Glyph>
      <path d="M4 20.5V6.2l8-2.7v17" />
      <path d="M12 9.5h7.5v11" />
      <path d="M2.5 20.5h19" />
      <path d="M7.2 9.5h1.6M7.2 13h1.6M7.2 16.5h1.6M15.2 13h1.6M15.2 16.5h1.6" />
    </Glyph>
  );
}

/** Team: people again, but with the one in front marked out. */
export function IconTeam() {
  return (
    <Glyph>
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5.5 20.5c0-3.4 2.9-6 6.5-6s6.5 2.6 6.5 6" />
      <path d="M3.5 11.5h1.8M4.4 10.6v1.8" />
    </Glyph>
  );
}

/** Client accounts: a person with a key, which is what an account is here. */
export function IconClientAccounts() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.8 6-5.8 1 0 2 .2 2.8.7" />
      <circle cx="17" cy="15.5" r="2.3" />
      <path d="M19 17.2l2.5 2.5M20.2 18.4l-.9.9" />
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
