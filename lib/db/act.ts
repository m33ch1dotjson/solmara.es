/*
 * Running a query as somebody.
 *
 * Every read and write from a request goes through here. The actor is set with
 * set_config(..., true) inside a transaction, which makes it transaction-local: when
 * the connection returns to the pool it carries nothing, so the next request cannot
 * inherit the previous visitor's identity. Without that `true` the pool would hand
 * one client another client's file, and nothing would ever log an error.
 *
 * There is deliberately no "run this without an actor" escape hatch. A query with no
 * actor set sees nothing, because every policy requires one — which is the correct
 * outcome for a code path that forgot to say who it was acting for.
 */

import { sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { Actor } from "@/lib/auth/session";
import { db } from "./index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function asActor<T>(actor: Actor, run: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    const role = actor.kind === "staff" ? actor.role : null;
    await tx.execute(sql`select app.set_actor(${actor.kind}, ${actor.id}::uuid, ${role})`);
    return run(tx);
  });
}

export type { Tx, PgTransaction };
