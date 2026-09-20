/*
 * Brand is configuration, never code.
 *
 * The brand is Solmavera. It was Solmara while testing, which is why none of it is
 * baked into layout, copy, identifiers or storage paths: the rename was a change of
 * values here, not a search and replace through the codebase.
 *
 * One deliberate exception: `caseCodePrefix` applies to NEW case codes only.
 * A case already communicated to a client as SM-CASE-0042 keeps that code forever;
 * renaming historic codes would break every email, invoice and folder that cites it.
 */

export type Locale = "en" | "nl" | "es";

export interface Brand {
  /** Shown in the staff nav. */
  staffName: string;
  /** Shown in client-facing headers and emails. */
  clientName: string;
  /** Legal entity, for contracts and legal text. */
  legalName: string;
  /** Host of this application. Every link in every email is built from it. */
  portalDomain: string;
  /** The public marketing site, which stays with the agency. */
  publicWebsite: string;
  /** Sender of automated mail. */
  emailFrom: string;
  /** Where client replies land — a human mailbox. */
  emailReplyTo: string;
  /** Prefix for newly minted case and client codes. */
  caseCodePrefix: string;
  /** Hue only; every accent surface derives from it. */
  accentHue: number;
  /** Interface language for staff. */
  defaultLocale: Locale;
  supportPhone: string;
  /** Office hours, per locale, as one sentence. */
  supportHours: Record<Locale, string>;
}

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

function envInt(key: string, fallback: number): number {
  const parsed = Number.parseInt(env(key, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const brand: Brand = {
  staffName: env("BRAND_STAFF_NAME", "Solmavera Portal"),
  clientName: env("BRAND_CLIENT_NAME", "Solmavera"),
  legalName: env("BRAND_LEGAL_NAME", "Solmavera S.L."),
  portalDomain: env("BRAND_PORTAL_DOMAIN", "app.solmara.es"),
  publicWebsite: env("BRAND_PUBLIC_WEBSITE", "solmavera.es"),
  emailFrom: env("BRAND_EMAIL_FROM", "noreply@solmavera.es"),
  emailReplyTo: env("BRAND_EMAIL_REPLY_TO", "info@solmavera.es"),
  caseCodePrefix: env("BRAND_CASE_CODE_PREFIX", "SM"),
  accentHue: envInt("BRAND_ACCENT_HUE", 250),
  defaultLocale: env("BRAND_DEFAULT_LOCALE", "en") as Locale,
  supportPhone: env("BRAND_SUPPORT_PHONE", "+34 952 00 11 22"),
  supportHours: {
    en: "Monday to Friday, 9:00 to 18:00",
    nl: "maandag tot en met vrijdag van 9:00 tot 18:00 uur",
    es: "de lunes a viernes, de 9:00 a 18:00",
  },
};

/** Absolute URL for anything that ends up in an email or a QR code. */
export function portalUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `https://${brand.portalDomain}${clean}`;
}
