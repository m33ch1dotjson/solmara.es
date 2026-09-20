"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { headers } from "next/headers";
import { addTeamMember, setTeamMemberActive, setTeamMemberRole, type StaffRole } from "@/lib/queries";
import { publicOrigin } from "@/lib/public-url";
import { createClient } from "@supabase/supabase-js";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES = ["ADMIN", "STAFF", "EXTERNAL"] as const;

function isRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/*
 * Inviting somebody is two things that must both happen: a row in staff_user, which
 * is what makes them staff, and a Supabase invite mail, which is how they get a
 * password. The row goes first — if the mail fails, an admin can resend it, whereas
 * a mailed invite with no row behind it lands on a portal that shows nothing.
 */
export async function inviteMemberAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const role = form.get("role");

  if (!name) return { ok: false, error: t.errors.nameRequiredStaff };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: t.errors.emailInvalid };
  if (!isRole(role)) return { ok: false, error: t.errors.createFailed };

  try {
    await addTeamMember(actor, { name, email, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key")) return { ok: false, error: t.errors.duplicateEmail };
    return { ok: false, error: t.errors.createFailed };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (url && secret) {
    const admin = createClient(url, secret, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      // The tunnel's host, not the listening socket: a link to 0.0.0.0 resolves
      // nowhere, and an invite is the one link somebody cannot work around.
      redirectTo: `${publicOrigin(await headers())}/auth/callback`,
    });
    revalidatePath("/admin/team");
    if (error) {
      // The row exists; say plainly that only the mail failed, because the next
      // step is "resend", not "create again".
      return { ok: true, message: t.team.addedButNoMail };
    }
  } else {
    revalidatePath("/admin/team");
    return { ok: true, message: t.team.addedButNoMail };
  }

  return { ok: true, message: t.team.invited };
}

export async function setRoleAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());
  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const id = text(form, "id");
  const role = form.get("role");
  if (!id || !isRole(role)) return { ok: false, error: t.errors.createFailed };

  // An admin who demotes themselves locks the workspace out of its own settings.
  if (id === actor.id && role !== "ADMIN") return { ok: false, error: t.team.cannotDemoteSelf };

  await setTeamMemberRole(actor, id, role);
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.team.roleChanged };
}

export async function setActiveAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());
  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const id = text(form, "id");
  const active = form.get("active") === "1";
  if (!id) return { ok: false, error: t.errors.createFailed };
  if (id === actor.id && !active) return { ok: false, error: t.team.cannotDisableSelf };

  await setTeamMemberActive(actor, id, active);
  revalidatePath("/admin", "layout");
  return { ok: true, message: active ? t.team.enabled : t.team.disabled };
}
