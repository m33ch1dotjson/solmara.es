/*
 * Who is asking.
 *
 * One auth system, two audiences. After Supabase verifies the magic link we look the
 * email up in staff_user and client_contact: being in staff_user is what makes
 * someone staff, not a claim in a token. Access is invite-only in both directions —
 * an address that matches neither table gets a session with no actor, and therefore
 * sees nothing at all, because every policy requires an actor.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientContact, staffUser } from "@/lib/db/schema";
import { serverClient } from "./supabase";

export type Actor =
  | { kind: "staff"; id: string; role: "ADMIN" | "STAFF"; name: string; email: string }
  | { kind: "client"; id: string; clientId: string; email: string };

/** The current actor, or null when nobody is signed in or the address is unknown. */
export async function currentActor(): Promise<Actor | null> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  const email = user.email.toLowerCase();

  const staff = await db.query.staffUser.findFirst({
    where: eq(staffUser.email, email),
  });
  if (staff?.active) {
    // Link the auth user on first sign-in so the row and the account stay tied.
    if (!staff.authUserId) {
      await db.update(staffUser).set({ authUserId: user.id }).where(eq(staffUser.id, staff.id));
    }
    return { kind: "staff", id: staff.id, role: staff.role, name: staff.name, email };
  }

  const contact = await db.query.clientContact.findFirst({
    where: eq(clientContact.email, email),
  });
  if (contact) {
    if (!contact.authUserId) {
      await db
        .update(clientContact)
        .set({ authUserId: user.id })
        .where(eq(clientContact.id, contact.id));
    }
    return { kind: "client", id: contact.id, clientId: contact.clientId, email };
  }

  return null;
}

export async function requireStaff(): Promise<Extract<Actor, { kind: "staff" }>> {
  const actor = await currentActor();
  if (actor?.kind !== "staff") throw new Error("UNAUTHORISED");
  return actor;
}

export async function requireClient(): Promise<Extract<Actor, { kind: "client" }>> {
  const actor = await currentActor();
  if (actor?.kind !== "client") throw new Error("UNAUTHORISED");
  return actor;
}
