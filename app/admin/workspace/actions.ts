"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy, isLocale } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { getWorkspace, updateWorkspace } from "@/lib/queries";
import {
  ALLOWED_IMAGE_TYPES,
  BUCKET_WORKSPACE,
  storageKey,
  upload,
  validateUpload,
} from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Empty means empty, not the string "". A blank field is an absent value. */
function orNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function saveWorkspaceAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  // The query layer checks this too. Here it decides which message comes back.
  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const defaultLocale = text(form, "defaultClientLocale");
  if (!isLocale(defaultLocale)) return { ok: false, error: t.errors.localeUnknown };

  let logoKey: string | null | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const check = validateUpload(logo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.errors.fileType,
      };
      return { ok: false, error: reason[check.reason] };
    }
    try {
      const key = storageKey("workspace", logo.name);
      await upload(BUCKET_WORKSPACE, key, logo);
      logoKey = key;
    } catch {
      return { ok: false, error: t.errors.uploadFailed };
    }
  }
  if (form.get("removeLogo") === "1") logoKey = null;

  await updateWorkspace(actor, {
    companyName: orNull(text(form, "companyName")),
    companyEmail: orNull(text(form, "companyEmail")),
    phone: orNull(text(form, "phone")),
    website: orNull(text(form, "website")),
    displayName: orNull(text(form, "displayName")),
    defaultClientLocale: defaultLocale,
    defaultCountry: text(form, "defaultCountry") || "ES",
    defaultCurrency: text(form, "defaultCurrency") || "EUR",
    ...(logoKey === undefined ? {} : { logoKey }),
  });

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.workspace.saved };
}

/*
 * The invoicing half of the workspace settings.
 *
 * Its own action rather than one giant form: these fields are read at exactly one
 * moment — when an invoice is finalised — and keeping them apart makes that easy to
 * see. Nothing here touches an invoice that already exists.
 */
export async function saveInvoicingAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const language = text(form, "invoiceLanguage");
  const days = Number.parseInt(text(form, "paymentTermsDays"), 10);

  let logoKey: string | null | undefined;
  const logo = form.get("invoiceLogo");
  if (logo instanceof File && logo.size > 0) {
    // PNG or JPEG only: those are what a PDF can embed directly. An SVG or a HEIC
    // would upload happily and then quietly fail to draw on the invoice.
    const check = validateUpload(logo, ["image/png", "image/jpeg"]);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.workspace.logoType,
      };
      return { ok: false, error: reason[check.reason] };
    }
    try {
      const key = storageKey("invoice-logo", logo.name);
      await upload(BUCKET_WORKSPACE, key, logo);
      logoKey = key;
    } catch {
      return { ok: false, error: t.errors.uploadFailed };
    }
  }
  if (form.get("removeInvoiceLogo") === "1") logoKey = null;

  const current = await getWorkspace(actor);
  if (!current) return { ok: false, error: t.errors.createFailed };

  await updateWorkspace(actor, {
    // Unchanged by this form, but updateWorkspace writes a whole row.
    companyName: current.companyName,
    companyEmail: current.companyEmail,
    phone: current.phone,
    website: current.website,
    displayName: current.displayName,
    defaultClientLocale: current.defaultClientLocale,
    defaultCountry: current.defaultCountry,
    defaultCurrency: current.defaultCurrency,

    legalName: orNull(text(form, "legalName")),
    taxId: orNull(text(form, "taxId")),
    address: orNull(text(form, "address")),
    postalCode: orNull(text(form, "postalCode")),
    city: orNull(text(form, "city")),
    province: orNull(text(form, "province")),
    country: orNull(text(form, "country")),
    accountHolder: orNull(text(form, "accountHolder")),
    iban: orNull(text(form, "iban")),
    bic: orNull(text(form, "bic")),
    bankName: orNull(text(form, "bankName")),
    paymentInstructions: orNull(text(form, "paymentInstructions")),
    invoicePrefix: text(form, "invoicePrefix") || "SOL",
    paymentTermsDays: Number.isFinite(days) ? Math.min(Math.max(days, 0), 365) : 14,
    invoiceLanguage: isLocale(language) ? language : "nl",
    invoiceNotes: orNull(text(form, "invoiceNotes")),
    ...(logoKey === undefined ? {} : { invoiceLogoKey: logoKey }),
  });

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.workspace.saved };
}
