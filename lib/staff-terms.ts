/*
 * Staff-facing labels.
 *
 * The database table is still called `sop` and stays that way: renaming tables and
 * routes is a migration for no gain. What the team reads on screen is a label, and
 * labels live here so changing one is a single edit rather than a search through the
 * codebase.
 */

export const STAFF_TERMS = {
  /** Plural, for the tab and the list heading. */
  procedures: "Service Procedures",
  /** Singular, for buttons and confirmations. */
  procedure: "Service Procedure",
  clients: "Klanten",
  properties: "Properties",
} as const;
