/*
 * Whether a client can actually get in.
 *
 * Three different things were being confused on screen, and this is where they are
 * pulled apart:
 *
 *   - `client.status` is INVITED until the client fills in their own details, and
 *     ACTIVE afterwards. It says nothing about whether they can sign in.
 *   - an invite is a link with an expiry date, which may have been used or not.
 *   - a portal account is a client_contact with an auth user attached. That is what
 *     a password belongs to, what can be switched off, and what this file is about.
 *
 * One client, one account. A second file for somebody who already exists is the
 * failure mode worth designing against, so registering, invite-redeeming and the
 * admin "create account" button all end at the same row.
 *
 * No database imports and no server-only code, so both a server page and a client
 * component can use it.
 */

export type AccountStatus =
  /** No login at all, and no link outstanding. Only a record in our own files. */
  | "NO_ACCOUNT"
  /** A link was sent, is still valid, and nobody has used it. */
  | "INVITED"
  /** The last link ran out unused. Same practical effect as no account. */
  | "EXPIRED"
  /** Signed up, but has not confirmed the address yet. */
  | "UNVERIFIED"
  /** Can sign in today. */
  | "ACTIVE"
  /** An admin switched the account off. The row stays; the door is locked. */
  | "DISABLED";

export interface AccessInput {
  /** There is a client_contact with an auth user behind it. */
  hasAccount: boolean;
  /** Set when an admin switched the account off. */
  disabledAt?: Date | string | null;
  /**
   * Whether Supabase has seen the address confirmed. Accounts an admin creates are
   * confirmed on the spot, so this is only ever false for self-registration while
   * the confirmation mail is still unopened.
   */
  emailVerified?: boolean;
  /** The most recent invite, if any. */
  inviteExpiresAt?: Date | string | null;
  inviteUsedAt?: Date | string | null;
}

export function accountStatus(input: AccessInput, now: Date = new Date()): AccountStatus {
  if (input.disabledAt) return "DISABLED";

  if (input.hasAccount) {
    // Undefined means nobody asked Supabase; treat that as verified rather than
    // painting every account on a page that did not load the auth data as broken.
    return input.emailVerified === false ? "UNVERIFIED" : "ACTIVE";
  }

  if (!input.inviteExpiresAt) return "NO_ACCOUNT";

  // A used invite without an account would be odd — redeeming is what makes the
  // account — but if it ever happens, treat it as spent rather than as pending.
  if (input.inviteUsedAt) return "EXPIRED";

  const expires = new Date(input.inviteExpiresAt);
  return expires.getTime() > now.getTime() ? "INVITED" : "EXPIRED";
}

/** Can this person sign in right now? The question the office actually asks. */
export function canSignIn(status: AccountStatus): boolean {
  return status === "ACTIVE" || status === "UNVERIFIED";
}
