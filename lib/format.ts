/*
 * Locale formatting.
 *
 * Amounts differ per locale and the handoff is specific about it:
 * €450.00 (en) / €450,00 (nl) / 450,00 € (es). Dates are written out for clients
 * ("Thursday 24 September") and abbreviated in staff metadata ("17 Sep 08:40").
 */

import type { Locale } from "./brand";
import type { Money } from "./domain";

const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  nl: "nl-NL",
  es: "es-ES",
};

export function formatMoney(amount: Money, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: amount.currency,
  }).format(amount.cents / 100);
}

/** "Thursday 24 September" — the client-facing form, no numerals for the month. */
export function formatLongDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

/** "24 September 2026" — for documents to keep. */
export function formatFullDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Month abbreviation for the mono date block, localised. */
export function monthAbbrev(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short" })
    .format(new Date(iso))
    .replace(".", "")
    .toUpperCase();
}

export function dayOfMonth(iso: string): string {
  return String(new Date(iso).getDate());
}

/** "Thursday 18 September · 09:12" for the staff header. */
export function staffTimestamp(date: Date, locale: Locale): string {
  const day = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${day} · ${time}`;
}

/** "4 of 9 approved" / "4 van 9 goedgekeurd". */
export function approvedOfTotal(approved: number, total: number, locale: Locale): string {
  const pattern: Record<Locale, string> = {
    en: `${approved} of ${total} approved`,
    nl: `${approved} van ${total} goedgekeurd`,
    es: `${approved} de ${total} aprobados`,
  };
  return pattern[locale];
}
