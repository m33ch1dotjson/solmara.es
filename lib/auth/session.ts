/*
 * Who is asking.
 *
 * One auth system, two audiences. After Supabase verifies the sign-in we look the
 * email up: being in staff_user is what makes somebody staff, not a claim in a
 * token. An address in neither table gets no actor and therefore sees nothing,
 * because every policy requires one.
 *
 * The lookup goes through app.resolve_actor(), a SECURITY DEFINER function, and it
 * has to. Reading staff_user through an ordinary query is blocked by the very policy
 * we are trying to satisfy — you would need to already be staff to discover that you
 * are staff, and a valid sign-in would bounce back to the login screen.
 */

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { serverClient } from "./supabase";

export type StaffRole = "ADMIN" | "STAFF" | "EXTERNAL";

export type Actor =
  | { kind: "staff"; id: string; role: StaffRole; name: string; email: string }
  | { kind: "client"; id: string; clientId: string; name: string; email: string };

// db.execute wants a row shape it can index; the named fields stay for clarity.
interface ResolvedRow extends Record<string, unknown> {
  kind: string;
  actor_id: string;
  role: string | null;
  name: string;
  client_id: string | null;
}

/** The current actor, or null when nobody is signed in or the address is unknown. */
export async function currentActor(): Promise<Actor | null> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  const email = user.email.toLowerCase();

  const rows = await db.execute<ResolvedRow>(
    sql`select * from app.resolve_actor(${email}, ${user.id}::uuid)`,
  );
  const row = rows[0];
  if (!row) return null;

  if (row.kind === "staff") {
    return {
      kind: "staff",
      id: row.actor_id,
      role: row.role === "ADMIN" ? "ADMIN" : row.role === "EXTERNAL" ? "EXTERNAL" : "STAFF",
      name: row.name,
      email,
    };
  }

  if (row.kind === "client" && row.client_id) {
    return { kind: "client", id: row.actor_id, clientId: row.client_id, name: row.name, email };
  }

  return null;
}

/**
 * For server actions. Throws, because an action has no page to send anybody to and
 * the caller should see a failure rather than a redirect.
 */
export async function requireStaff(): Promise<Extract<Actor, { kind: "staff" }>> {
  const actor = await currentActor();
  if (actor?.kind !== "staff") throw new Error("UNAUTHORISED");
  return actor;
}

/**
 * For pages. Redirects rather than throwing: the layout already renders the sign-in
 * screen for a signed-out visitor, and a thrown error there would log a stack trace
 * on every anonymous visit — noise that buries the failures worth reading.
 */
export async function staffOrRedirect(): Promise<Extract<Actor, { kind: "staff" }>> {
  const actor = await currentActor();
  if (!actor) redirect("/admin");
  if (actor.kind !== "staff") redirect("/");
  return actor;
}

/**
 * For the two administration screens. A hidden link is a courtesy; this is the
 * permission. The database says the same thing again in app.is_admin(), because a
 * server action is its own endpoint and this check is not on its path.
 */
export async function adminOrRedirect(): Promise<Extract<Actor, { kind: "staff" }>> {
  const actor = await staffOrRedirect();
  if (actor.role !== "ADMIN") redirect("/admin");
  return actor;
}

export async function requireClient(): Promise<Extract<Actor, { kind: "client" }>> {
  const actor = await currentActor();
  if (actor?.kind !== "client") throw new Error("UNAUTHORISED");
  return actor;
}
