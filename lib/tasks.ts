/*
 * The office's to-do list.
 *
 * Small on purpose. A task is a line of text that somebody eventually ticks; the
 * detail behind it, the deadline, the colleague and the client are all optional,
 * and a list that demanded them would be a list nobody adds to.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import { asActor } from "@/lib/db/act";
import { client, staffUser, task } from "@/lib/db/schema";

export interface TaskInput {
  title: string;
  /** HTML, already sanitised by the caller. */
  body: string;
  dueDate: string | null;
  assignedTo: string | null;
  clientId: string | null;
}

/**
 * Every task, open ones first.
 *
 * Ticked tasks stay in the list — that is the whole point of a flag rather than a
 * delete — but they sink to the bottom, because the top of a to-do list should be
 * the part that is still to do.
 */
export async function listTasks(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: task.id,
        title: task.title,
        body: task.body,
        done: task.done,
        doneAt: task.doneAt,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        assigneeName: staffUser.name,
        clientId: task.clientId,
        clientName: client.name,
        createdAt: task.createdAt,
      })
      .from(task)
      .leftJoin(staffUser, eq(staffUser.id, task.assignedTo))
      .leftJoin(client, eq(client.id, task.clientId))
      .orderBy(
        asc(task.done),
        // Undated work sorts after dated work rather than before it: a task with a
        // deadline is the one asking for attention.
        sql`${task.dueDate} asc nulls last`,
        desc(task.createdAt),
      ),
  );
}

/** How many are still open, for the overview tile. */
export async function openTaskCount(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.execute<{ n: number }>(
      sql`select count(*)::int as n from app.task where not done`,
    );
    return Number(rows[0]?.n ?? 0);
  });
}

/**
 * A new task needs a title and nothing else.
 *
 * That is deliberate: the fastest way to get something out of your head is one
 * line and Enter. Everything else is added by opening it afterwards.
 */
export async function createTask(actor: Actor, title: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(task)
      .values({ title: title.trim(), createdBy: actor.id })
      .returning({ id: task.id });
    if (!created) throw new Error("TASK_NOT_CREATED");
    return created.id;
  });
}

export async function updateTask(actor: Actor, id: string, input: TaskInput) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(task)
      .set({
        title: input.title.trim(),
        body: input.body,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo,
        clientId: input.clientId,
        updatedAt: new Date(),
      })
      .where(eq(task.id, id))
      .returning({ id: task.id });
    return Boolean(updated);
  });
}

/**
 * Ticking and unticking.
 *
 * Who ticked it and when are kept, so the list can say "done by Yulian on Tuesday"
 * rather than only that it happened. Unticking clears both: a task that is open
 * again was never finished.
 */
export async function setTaskDone(actor: Actor, id: string, done: boolean) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(task)
      .set({
        done,
        doneAt: done ? new Date() : null,
        doneBy: done ? actor.id : null,
        updatedAt: new Date(),
      })
      .where(eq(task.id, id))
      .returning({ id: task.id });
    return Boolean(updated);
  });
}

export async function deleteTask(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [deleted] = await tx.delete(task).where(eq(task.id, id)).returning({ id: task.id });
    return Boolean(deleted);
  });
}

/** The tasks hanging off one client, for their own page. */
export async function listClientTasks(actor: Actor, clientId: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: task.id,
        title: task.title,
        done: task.done,
        dueDate: task.dueDate,
      })
      .from(task)
      .where(and(eq(task.clientId, clientId)))
      .orderBy(asc(task.done), sql`${task.dueDate} asc nulls last`, desc(task.createdAt)),
  );
}
