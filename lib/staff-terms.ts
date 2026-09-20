/*
 * Staff-facing vocabulary.
 *
 * The internal entity is a `case` and stays that way in the database, the types and
 * the URLs — renaming those would be a migration for no gain. What the team reads on
 * screen is a label, and labels live here so changing one is a single edit.
 *
 * One constraint when picking a word: it must not collide with "Services" in the
 * admin menu. A service is the template (NIE Application); a case is one instance of
 * it for one client. Calling both "services" would blur the distinction the whole
 * workflow engine rests on.
 */

export interface StaffTerms {
  /** Plural, for the nav and the list screen. */
  cases: string;
  /** Singular, for the detail screen and buttons. */
  case: string;
  /** Column header in tables. */
  caseColumn: string;
  clients: string;
}

export const STAFF_TERMS: StaffTerms = {
  cases: "Cases",
  case: "Case",
  caseColumn: "Case",
  clients: "Clients",
};
