"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { sanitizeGuideHtml } from "@/lib/sanitize";
import { createTask, deleteTask, setTaskDone, updateTask } from "@/lib/tasks";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function addTaskAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const title = text(form, "title");
  if (!title) return { ok: false, error: t.tasksPage.titleRequired };

  await createTask(actor, title);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function saveTaskAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  const title = text(form, "title");
  if (!id) return { ok: false, error: t.tasksPage.notFound };
  if (!title) return { ok: false, error: t.tasksPage.titleRequired };

  const done = await updateTask(actor, id, {
    title,
    // Written in a contentEditable and rendered back with dangerouslySetInnerHTML,
    // so it goes through the same sanitiser as a Process Guide.
    body: sanitizeGuideHtml(String(form.get("body") ?? "")),
    dueDate: orNull(text(form, "dueDate")),
    assignedTo: orNull(text(form, "assignedTo")),
    clientId: orNull(text(form, "clientId")),
  });

  if (!done) return { ok: false, error: t.tasksPage.notFound };

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.tasksPage.saved };
}

/**
 * Ticking a box. Its own action rather than part of saving, because it is the thing
 * people do most and it should cost one click and no form.
 */
export async function toggleTaskAction(id: string, done: boolean): Promise<void> {
  const actor = await requireStaff();
  if (!id) return;
  await setTaskDone(actor, id, done);
  revalidatePath("/admin", "layout");
}

export async function deleteTaskAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;
  await deleteTask(actor, id);
  revalidatePath("/admin", "layout");
}
