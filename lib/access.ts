/*
 * Whether a client can actually get in.
 *
 * Three different things were being confused on screen, and this is where they are
 * pulled apart:
 *
 *   - `client.status` is INVITED until the client fills in their own details, and
 *     ACTIVE afterwards. It says nothing about whether they can sign in.
 *   - an invite is a link with an expiry date, which may have been used or not.
 *   - a login exists only once somebody has redeemed such a link: that is the moment
 *     app.invite_redeem creates a client_contact and attaches the auth user to it.
 *
 * Nobody can register themselves. There is no sign-up screen, and signing in with an
 * address that is in neither table gets you nothing — the only door is a link a
 * colleague made. So "did they make this account themselves?" has one answer in this
 * system: no, somebody here invited them.
 *
 * No database imports, so both a server page and a client component can use it.
 */

export type ClientAccess =
  /** Has signed in at least once: there is a login attached to this client. */
  | "ACTIVE"
  /** A link is out there, unused and still valid. */
  | "PENDING"
  /** The last link was never used and has run out. */
  | "EXPIRED"
  /** No link was ever made: this client cannot reach the portal at all. */
  | "NONE";

export interface AccessInput {
  hasAccount: boolean;
  /** The most recent invite, if any. */
  inviteExpiresAt: Date | string | null;
  inviteUsedAt: Date | string | null;
}

export function clientAccess(input: AccessInput, now: Date = new Date()): ClientAccess {
  if (input.hasAccount) return "ACTIVE";
  if (!input.inviteExpiresAt) return "NONE";

  // A used invite without an account would be odd — redeeming is what makes the
  // account — but if it ever happens, treat it as spent rather than as pending.
  if (input.inviteUsedAt) return "EXPIRED";

  const expires = new Date(input.inviteExpiresAt);
  return expires.getTime() > now.getTime() ? "PENDING" : "EXPIRED";
}
