/*
 * The status vocabulary, shared by both portals.
 *
 * Two rules from the design handoff are enforced here rather than left to the
 * components:
 *
 * 1. Status is never colour alone. Every status carries a glyph and a word, so it
 *    survives colour-blindness, greyscale printing and a phone screen in sunlight.
 *    There is no way to render a status without its word.
 *
 * 2. Lateness is never shown to a client. `clientLabel: null` marks a status that
 *    has no client-facing form, and `clientStatusLabel()` refuses to produce one.
 *    A client who sees that their case is late phones the office — which is the
 *    thing the portal exists to prevent.
 */

import type { Locale } from "./brand";

/** Colour token names. A tone is never used without its glyph and word. */
export type Tone = "ok" | "info" | "warn" | "danger" | "mute" | "accent";

export type StatusKey =
  | "approved"
  | "paid"
  | "received"
  | "required"
  | "rejected"
  | "expired"
  | "waived"
  | "dueToday"
  | "dueSoon"
  | "dueLater"
  | "overdue"
  | "waitingOnClient"
  | "noDate";

interface StatusPresentation {
  tone: Tone;
  glyph: string;
  staff: Record<Locale, string>;
  /** `null` means: this status must never reach a client. */
  client: Record<Locale, string> | null;
}

const T = (en: string, nl: string, es: string): Record<Locale, string> => ({ en, nl, es });

export const STATUS: Record<StatusKey, StatusPresentation> = {
  approved: {
    tone: "ok",
    glyph: "✓",
    staff: T("Approved", "Goedgekeurd", "Aprobado"),
    client: T("Checked and accepted", "Gecontroleerd en akkoord", "Comprobado y aceptado"),
  },
  paid: {
    tone: "ok",
    glyph: "✓",
    staff: T("Paid", "Betaald", "Pagado"),
    client: T("Paid", "Betaald", "Pagado"),
  },
  received: {
    tone: "info",
    glyph: "◐",
    staff: T("Received", "Ontvangen", "Recibido"),
    client: T("We are checking it", "Wij controleren hem", "Lo estamos comprobando"),
  },
  required: {
    tone: "mute",
    glyph: "○",
    staff: T("Required", "Vereist", "Requerido"),
    client: T("Still missing", "Ontbreekt nog", "Aún falta"),
  },
  rejected: {
    tone: "danger",
    glyph: "✕",
    staff: T("Rejected", "Afgekeurd", "Rechazado"),
    client: T("Not accepted", "Niet geaccepteerd", "No aceptado"),
  },
  expired: {
    tone: "warn",
    glyph: "⚠",
    staff: T("Expired", "Verlopen", "Caducado"),
    client: null,
  },
  waived: {
    tone: "mute",
    glyph: "—",
    staff: T("Waived", "Niet nodig", "No aplicable"),
    client: T("Not needed", "Niet nodig", "No necesario"),
  },
  dueToday: {
    tone: "warn",
    glyph: "▲",
    staff: T("Today", "Vandaag", "Hoy"),
    client: T(
      "Something is needed from you",
      "Wij hebben iets van u nodig",
      "Necesitamos algo de usted",
    ),
  },
  dueSoon: {
    tone: "info",
    glyph: "◆",
    staff: T("Soon", "Binnenkort", "Pronto"),
    client: null,
  },
  dueLater: {
    tone: "mute",
    glyph: "○",
    staff: T("Later", "Later", "Más adelante"),
    client: null,
  },
  overdue: {
    tone: "danger",
    glyph: "■",
    staff: T("Late", "Te laat", "Retrasado"),
    client: null,
  },
  waitingOnClient: {
    tone: "mute",
    glyph: "◌",
    staff: T("Waiting", "Wachten", "En espera"),
    client: null,
  },
  noDate: {
    tone: "mute",
    glyph: "○",
    staff: T("No date", "Geen datum", "Sin fecha"),
    client: null,
  },
};

export function staffStatusLabel(key: StatusKey, locale: Locale = "en"): string {
  return STATUS[key].staff[locale];
}

/**
 * The client-facing label, or `null` when this status has no client form.
 * Callers must handle `null` by omitting the status entirely — never by falling
 * back to the staff wording.
 */
export function clientStatusLabel(key: StatusKey, locale: Locale): string | null {
  return STATUS[key].client?.[locale] ?? null;
}

/** True when a status may be shown to a client at all. */
export function isClientSafe(key: StatusKey): boolean {
  return STATUS[key].client !== null;
}
