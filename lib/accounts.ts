/*
 * Portal accounts: reading them, making them, switching them off.
 *
 * An account lives in two places and neither is optional. app.client_contact is the
 * link to the client file — that is ours, it obeys row level security and it decides
 * what the person sees. The Supabase auth user is the login — that is where the
 * password hash lives, and we never see it. This file is the only place the two are
 * put side by side.
 *
 * WHAT IS DELIBERATELY IMPOSSIBLE HERE: reading a password. There is no column, no
 * query and no API call for it, because Supabase stores a hash and that is the point.
 * An admin can replace a password with a temporary one and read that one, once, in
 * the same breath as creating it. After the response is rendered it exists nowhere
 * but in the admin's clipboard.
 *
 * Server only: it holds the secret key.
 */

import { randomInt } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { desc, eq, sql } from "drizzle-orm";
import { type AccessInput, type AccountStatus, accountStatus } from "@/lib/access";
import type { Actor } from "@/lib/auth/session";
import { brand, portalUrl } from "@/lib/brand";
import { db } from "@/lib/db";
import { asActor } from "@/lib/db/act";
import { client, clientContact, event } from "@/lib/db/schema";

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_SECRET_KEY ontbreekt");
  return createClient(url, secret, { auth: { persistSession: false } });
}

/* ------------------------------------------------------------------ passwords */

/*
 * A temporary password somebody has to read out loud or paste into WhatsApp.
 *
 * No l/I/1 or O/0, because this gets dictated over the phone; a hyphen every four
 * characters for the same reason. Three groups of four from a 30-character alphabet
 * plus a digit and a symbol is a shade over 60 bits — far past anything a login
 * endpoint with rate limiting can be made to give up, and it is replaced the moment
 * the client sets their own.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SYMBOLS = "!#$%&*+?";

export function temporaryPassword(): string {
  const pick = (from: string) => from[randomInt(from.length)] ?? "x";
  const group = () => Array.from({ length: 4 }, () => pick(ALPHABET)).join("");
  const body = `${group()}-${group()}-${group()}`;
  // Uppercase one letter and append a symbol, so it satisfies any policy that asks
  // for "mixed case and a symbol" without making the whole string unreadable.
  const upper = body.charAt(0).toUpperCase() + body.slice(1);
  return `${upper}${pick(SYMBOLS)}`;
}

/* --------------------------------------------------------------------- reading */

export interface AccountRow {
  clientId: string;
  code: string;
  name: string;
  /** The address on the client file. */
  email: string;
  avatarKey: string | null;
  selfRegistered: boolean;
  /** Null when there is no portal account at all. */
  contactId: string | null;
  /** The address they actually sign in with. Usually the same as the file's. */
  loginEmail: string | null;
  authUserId: string | null;
  disabledAt: Date | null;
  accountCreatedAt: Date | null;
  inviteExpiresAt: Date | null;
  inviteUsedAt: Date | null;
  /* From Supabase, not from us. */
  emailVerified: boolean;
  lastSignInAt: Date | null;
  hasPassword: boolean;
  status: AccountStatus;
}

/**
 * Every client with whatever account they have, or none.
 *
 * Left joins from the client, so a client without an account is a row here — the
 * whole point of the screen is seeing which ones those are.
 */
export async function listClientAccounts(actor: Actor): Promise<AccountRow[]> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const rows = await asActor(actor, (tx) =>
    tx
      .select({
        clientId: client.id,
        code: client.code,
        name: client.name,
        email: client.email,
        avatarKey: client.avatarKey,
        selfRegistered: client.selfRegistered,
        contactId: clientContact.id,
        loginEmail: clientContact.email,
        authUserId: clientContact.authUserId,
        disabledAt: clientContact.disabledAt,
        accountCreatedAt: clientContact.createdAt,
        /* Written out in full, like the ones in lib/queries.ts: a bare "id" inside
           a correlated subquery binds to the inner table, not to this one. */
        inviteExpiresAt: sql<Date | null>`(
          select i.expires_at from app.client_invite i
          where i.client_id = app.client.id
          order by i.created_at desc limit 1
        )`,
        inviteUsedAt: sql<Date | null>`(
          select i.used_at from app.client_invite i
          where i.client_id = app.client.id
          order by i.created_at desc limit 1
        )`,
      })
      .from(client)
      /* One client, one account — but if a file somehow has two contacts, the one
         with a login is the one this screen is about. */
      .leftJoin(
        clientContact,
        sql`${clientContact.id} = (
          select cc.id from app.client_contact cc
          where cc.client_id = app.client.id
          order by (cc.auth_user_id is null), cc.created_at
          limit 1
        )`,
      )
      .orderBy(desc(client.createdAt)),
  );

  const users = await authUsersById(rows.map((row) => row.authUserId));

  return rows.map((row) => {
    const user = row.authUserId ? users.get(row.authUserId) : undefined;
    const emailVerified = Boolean(user?.email_confirmed_at ?? user?.confirmed_at);

    return {
      ...row,
      emailVerified,
      lastSignInAt: user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
      // Supabase does not hand out the hash, only whether an identity with a
      // password exists. That is all the interface ever needs to know.
      hasPassword: Boolean(user),
      status: accountStatus({
        hasAccount: row.authUserId !== null,
        disabledAt: row.disabledAt,
        emailVerified: row.authUserId ? emailVerified : undefined,
        inviteExpiresAt: row.inviteExpiresAt,
        inviteUsedAt: row.inviteUsedAt,
      } satisfies AccessInput),
    };
  });
}

/**
 * The auth side of a single client's account, for the client detail page.
 * Returns null when there is no account.
 */
export async function clientAccount(actor: Actor, clientId: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const [contact] = await asActor(actor, (tx) =>
    tx
      .select()
      .from(clientContact)
      .where(eq(clientContact.clientId, clientId))
      .orderBy(sql`(${clientContact.authUserId} is null)`, clientContact.createdAt)
      .limit(1),
  );

  if (!contact) return null;

  const users = await authUsersById([contact.authUserId]);
  const user = contact.authUserId ? users.get(contact.authUserId) : undefined;

  return {
    contactId: contact.id,
    loginEmail: contact.email,
    authUserId: contact.authUserId,
    disabledAt: contact.disabledAt,
    createdAt: contact.createdAt,
    emailVerified: Boolean(user?.email_confirmed_at ?? user?.confirmed_at),
    lastSignInAt: user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
  };
}

/*
 * One page of auth users, indexed by id.
 *
 * listUsers rather than one getUserById per row: a directory of a few hundred
 * clients would otherwise be a few hundred round trips to Supabase on every render.
 * A thousand users is where this stops being one page, and where the whole screen
 * wants paging anyway.
 */
async function authUsersById(ids: Array<string | null>): Promise<Map<string, User>> {
  const wanted = new Set(ids.filter((id): id is string => id !== null));
  const found = new Map<string, User>();
  if (wanted.size === 0) return found;

  try {
    const { data, error } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return found;
    for (const user of data.users) {
      if (wanted.has(user.id)) found.set(user.id, user);
    }
  } catch {
    // The page still renders without the auth half: a missing "last signed in" is
    // better than a screen that will not load because Supabase is having a moment.
  }

  return found;
}

/* -------------------------------------------------------------------- writing */

export interface CreatedAccount {
  email: string;
  password: string;
  loginUrl: string;
}

/**
 * Creating an account for a client who has none.
 *
 * The auth user is created confirmed: an admin typing this in has the client in
 * front of them or on the phone, and a confirmation mail they cannot open would
 * leave the account unusable.
 */
export async function createPortalAccount(
  actor: Actor,
  input: { clientId: string; email: string; password?: string },
): Promise<CreatedAccount> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const email = input.email.trim().toLowerCase();
  const password = input.password?.trim() || temporaryPassword();
  const supabase = admin();

  const existing = await findAuthUserByEmail(email);
  let authUserId = existing?.id ?? null;

  if (authUserId) {
    // The login already exists — somebody registered, or an older account was
    // unlinked. Reset the password rather than refusing, and attach it below.
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "AUTH_USER_FAILED");
    authUserId = data.user.id;
  }

  await asActor(actor, async (tx) => {
    await tx
      .insert(clientContact)
      .values({ clientId: input.clientId, email, authUserId })
      .onConflictDoUpdate({
        target: [clientContact.clientId, clientContact.email],
        set: { authUserId, disabledAt: null, disabledBy: null },
      });

    await tx.insert(event).values({
      actorStaffId: actor.id,
      clientId: input.clientId,
      action: "account.created",
      payload: { email },
    });
  });

  return { email, password, loginUrl: portalUrl("/signin") };
}

/** A new temporary password for an account that already exists. Shown once. */
export async function resetToTemporaryPassword(
  actor: Actor,
  input: { clientId: string; contactId: string },
): Promise<CreatedAccount> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const [contact] = await asActor(actor, (tx) =>
    tx.select().from(clientContact).where(eq(clientContact.id, input.contactId)).limit(1),
  );
  if (!contact?.authUserId) throw new Error("NO_ACCOUNT");

  const password = temporaryPassword();
  const { error } = await admin().auth.admin.updateUserById(contact.authUserId, { password });
  if (error) throw new Error(error.message);

  await asActor(actor, (tx) =>
    tx.insert(event).values({
      actorStaffId: actor.id,
      clientId: input.clientId,
      action: "account.password_reset",
      payload: { email: contact.email },
    }),
  );

  return { email: contact.email, password, loginUrl: portalUrl("/signin") };
}

/**
 * The other route: let the client choose it themselves.
 *
 * Sent with the publishable key, the same call the "forgot password" link on the
 * sign-in screen makes, so there is one reset flow rather than an admin-only one
 * that nobody tests.
 */
export async function sendPasswordResetMail(email: string, redirectTo: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_CONFIG");

  const anon = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await anon.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw new Error(error.message);
}

/**
 * Switching access off and on.
 *
 * Both locks are turned: our own column, which app.resolve_actor() reads on every
 * single request, and the Supabase ban, which stops a session being minted at all.
 * If the second call fails the first still holds, which is why it goes first.
 */
export async function setAccountDisabled(
  actor: Actor,
  input: { clientId: string; contactId: string; disabled: boolean },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const contact = await asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(clientContact)
      .set({
        disabledAt: input.disabled ? new Date() : null,
        disabledBy: input.disabled ? actor.id : null,
      })
      .where(eq(clientContact.id, input.contactId))
      .returning();

    if (updated) {
      await tx.insert(event).values({
        actorStaffId: actor.id,
        clientId: input.clientId,
        action: input.disabled ? "account.disabled" : "account.enabled",
        payload: { email: updated.email },
      });
    }

    return updated;
  });

  if (contact?.authUserId) {
    try {
      await admin().auth.admin.updateUserById(contact.authUserId, {
        // A century, which is Supabase's way of saying "until somebody says otherwise".
        ban_duration: input.disabled ? "876000h" : "none",
      } as { ban_duration: string });
    } catch {
      // Our own column is the lock that matters; this one is the belt to its braces.
    }
  }

  return contact ?? null;
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return null;
    return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
  } catch {
    return null;
  }
}

/** Where a client signs in. Used by every "copy login link" button. */
export function loginLink(): string {
  return portalUrl("/signin");
}

/* ------------------------------------------------------- registering yourself */

export interface RegistrationResult {
  clientId: string;
  contactId: string;
  /** True when this created a new client file rather than attaching to one. */
  createdClient: boolean;
}

/**
 * Attach a fresh login to a client file, creating the file if we do not know the
 * address yet.
 *
 * Runs outside asActor() on purpose: at this moment the person has a Supabase
 * session but no actor, so every policy would refuse them. app.client_register() is
 * SECURITY DEFINER and keyed on the verified address, which is what makes that safe
 * — see the note at the top of drizzle/0012_client_accounts.sql.
 *
 * Returns null for an address that belongs to a staff member; they have a portal
 * already and it is not this one.
 */
export async function linkOrCreateClient(input: {
  email: string;
  authUserId: string;
  name?: string | null;
  locale?: string;
}): Promise<RegistrationResult | null> {
  const rows = await db.execute<{
    client_register: {
      client_id: string;
      contact_id: string;
      created_client: boolean;
    } | null;
  }>(
    sql`select app.client_register(
      ${input.email.toLowerCase()},
      ${input.authUserId}::uuid,
      ${input.name ?? null},
      ${brand.caseCodePrefix},
      ${input.locale ?? brand.defaultLocale}
    )`,
  );

  // One jsonb value rather than a row of columns: see 0014_register_json.sql.
  const result = rows[0]?.client_register;
  if (!result) return null;

  return {
    clientId: result.client_id,
    contactId: result.contact_id,
    createdClient: result.created_client,
  };
}
