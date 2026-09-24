"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createPortalAccount,
  loginLink,
  resetToTemporaryPassword,
  sendPasswordResetMail,
  setAccountDisabled,
  temporaryPassword,
} from "@/lib/accounts";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { publicUrl } from "@/lib/public-url";

/*
 * The account actions.
 *
 * Every one of them is admin-only, checked here rather than trusted from the screen
 * that called it: a server action is its own endpoint, reachable by anybody who can
 * read the page source, and the hidden menu item is not a permission.
 *
 * The two that mint a password return it in the result and nowhere else. It is not
 * written to our database, not logged and not mailed — the modal that shows it is
 * the only copy, which is what "shown once" has to mean if it is to mean anything.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type SecretResult =
  | { ok: true; email: string; password: string; loginUrl: string }
  | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

async function requireAdmin() {
  const actor = await requireStaff();
  if (actor.role !== "ADMIN") throw new Error("ADMIN_ONLY");
  return actor;
}

export async function createAccountAction(form: FormData): Promise<SecretResult> {
  const t = copy(await currentLocale());

  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    return { ok: false, error: t.errors.adminOnly };
  }

  const clientId = text(form, "clientId");
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");

  if (!clientId) return { ok: false, error: t.errors.createFailed };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: t.errors.emailInvalid };
  if (password && password.length < 8) return { ok: false, error: t.accounts.passwordTooShort };

  try {
    const created = await createPortalAccount(actor, { clientId, email, password });
    revalidatePath("/admin/client-accounts");
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/admin/clients");
    return { ok: true, ...created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false, error: message || t.errors.createFailed };
  }
}

export async function newPasswordAction(form: FormData): Promise<SecretResult> {
  const t = copy(await currentLocale());

  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    return { ok: false, error: t.errors.adminOnly };
  }

  const clientId = text(form, "clientId");
  const contactId = text(form, "contactId");
  if (!clientId || !contactId) return { ok: false, error: t.errors.createFailed };

  try {
    const reset = await resetToTemporaryPassword(actor, { clientId, contactId });
    revalidatePath("/admin/client-accounts");
    return { ok: true, ...reset };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false, error: message || t.errors.createFailed };
  }
}

/** A password for the create form, generated where the generator lives. */
export async function suggestPasswordAction(): Promise<string> {
  await requireAdmin();
  return temporaryPassword();
}

export async function sendResetAction(form: FormData): Promise<ActionResult> {
  const t = copy(await currentLocale());

  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: t.errors.adminOnly };
  }

  const email = text(form, "email").toLowerCase();
  if (!email) return { ok: false, error: t.errors.emailInvalid };

  try {
    // The client lands on the same page a "forgot password" from the sign-in screen
    // leads to; there is one way to choose a new password, not two.
    await sendPasswordResetMail(email, publicUrl(await headers(), "/auth/callback?next=/reset"));
    return { ok: true, message: t.accounts.resetSent };
  } catch {
    return { ok: false, error: t.accounts.resetFailed };
  }
}

export async function setAccessAction(form: FormData): Promise<ActionResult> {
  const t = copy(await currentLocale());

  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    return { ok: false, error: t.errors.adminOnly };
  }

  const clientId = text(form, "clientId");
  const contactId = text(form, "contactId");
  const disabled = form.get("disabled") === "1";
  if (!clientId || !contactId) return { ok: false, error: t.errors.createFailed };

  await setAccountDisabled(actor, { clientId, contactId, disabled });
  revalidatePath("/admin/client-accounts");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");

  return { ok: true, message: disabled ? t.accounts.disabledDone : t.accounts.enabledDone };
}

/** So the browser can copy it without knowing how the portal's domain is configured. */
export async function loginLinkAction(): Promise<string> {
  await requireStaff();
  return loginLink();
}
