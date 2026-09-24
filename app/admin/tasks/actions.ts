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

/**
 * Adding a task.
 *
 * Returns nothing, because it is handed straight to a form's `action`: that is
 * what makes the button work before hydration and without JavaScript, and a form
 * action is not allowed to return a value. An empty title is refused by `required`
 * in the browser and, if that is bypassed, silently ignored here — there is no
 * screen to show an error on when the form posts itself.
 */
export async function addTaskAction(form: FormData): Promise<void> {
  const actor = await requireStaff();

  const title = text(form, "title");
  if (!title) return;

  await createTask(actor, title);
  revalidatePath("/admin", "layout");
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
 * Ticking a box.
 *
 * Takes FormData so the checkbox can be a submit button in a tiny form: that works
 * on the first paint, before React has hydrated, and keeps working if the script
 * never arrives. Ticking things off is the thing people do most on this screen, so
 * it is the thing that must not depend on anything.
 */
export async function toggleTaskAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;
  await setTaskDone(actor, id, form.get("done") === "1");
  revalidatePath("/admin", "layout");
}

export async function deleteTaskAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;
  await deleteTask(actor, id);
  revalidatePath("/admin", "layout");
}
