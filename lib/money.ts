/*
 * Money, and the arithmetic an invoice is allowed to do with it.
 *
 * Everything is integer cents. A euro is never a JavaScript number with a decimal
 * point in it: 0.1 + 0.2 is not 0.3, and an invoice that is a cent out is an invoice
 * somebody has to phone about.
 *
 * This module is the only place that rounds. The editor in the browser, the server
 * action that stores the invoice and the PDF generator all call the same functions
 * with the same inputs, which is what makes "portal says €423.49, PDF says €423.50"
 * impossible rather than unlikely.
 *
 * Rounding is half-up on the absolute value, per line, before the lines are added.
 * That is what a Spanish invoice does and what every accounting package expects:
 * each line is a real amount that must itself be payable, so the VAT on a line is
 * rounded there and not at the bottom of the page.
 */

export type Cents = number;

/** Half-up, symmetric around zero, so a credit line rounds like the charge did. */
function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export interface LineInput {
  description: string;
  /** Up to three decimals; hours and part quantities are real. */
  quantity: number;
  unitPriceCents: Cents;
  /** A percentage: 21 means 21%. */
  vatRate: number;
}

export interface LineTotals {
  subtotalCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
}

/**
 * One line's three amounts.
 *
 * quantity × unit price is rounded to a cent first, because that product is what
 * appears on the page as the line subtotal; the VAT is then a percentage of that
 * printed number, not of a longer invisible one. Anything else produces a column
 * that does not add up when a human checks it with a calculator.
 */
export function lineTotals(line: LineInput): LineTotals {
  const subtotalCents = roundHalfUp(line.quantity * line.unitPriceCents);
  const taxCents = roundHalfUp((subtotalCents * line.vatRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export interface VatGroup {
  rate: number;
  baseCents: Cents;
  taxCents: Cents;
}

export interface InvoiceTotals {
  lines: LineTotals[];
  subtotalCents: Cents;
  taxTotalCents: Cents;
  totalCents: Cents;
  /** One entry per rate actually used, so a mixed invoice can show both. */
  vatGroups: VatGroup[];
}

export function invoiceTotals(lines: LineInput[]): InvoiceTotals {
  const computed = lines.map(lineTotals);

  const subtotalCents = computed.reduce((sum, line) => sum + line.subtotalCents, 0);
  const taxTotalCents = computed.reduce((sum, line) => sum + line.taxCents, 0);

  const groups = new Map<number, VatGroup>();
  lines.forEach((line, index) => {
    const totals = computed[index];
    if (!totals) return;
    const group = groups.get(line.vatRate) ?? { rate: line.vatRate, baseCents: 0, taxCents: 0 };
    group.baseCents += totals.subtotalCents;
    group.taxCents += totals.taxCents;
    groups.set(line.vatRate, group);
  });

  return {
    lines: computed,
    subtotalCents,
    taxTotalCents,
    totalCents: subtotalCents + taxTotalCents,
    vatGroups: [...groups.values()].sort((a, b) => a.rate - b.rate),
  };
}

/* ------------------------------------------------------------------ parsing */

/**
 * A typed amount into cents.
 *
 * Accepts both separators, because a Dutch keyboard produces "1.234,56" and an
 * English one "1,234.56", and a colleague should not have to think about which the
 * field wants. The last separator in the string is the decimal one.
 */
export function parseAmountToCents(input: string): Cents | null {
  const trimmed = (input ?? "").trim().replace(/\s|€/g, "");
  if (trimmed === "") return null;
  if (!/^-?[\d.,]+$/.test(trimmed)) return null;

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);

  let whole = trimmed;
  let fraction = "";

  if (decimalAt !== -1) {
    const tail = trimmed.slice(decimalAt + 1);
    // Three digits after the last separator means it was a thousands separator:
    // "1.234" is a thousand and change, not one euro twenty-three.
    if (tail.length !== 3 || (lastComma !== -1 && lastDot !== -1)) {
      whole = trimmed.slice(0, decimalAt);
      fraction = tail;
    }
  }

  const digits = whole.replace(/[.,]/g, "");
  const negative = digits.startsWith("-");
  const wholeCents = Number.parseInt(digits.replace("-", "") || "0", 10) * 100;
  const fractionCents = Number.parseInt((fraction + "00").slice(0, 2) || "0", 10);

  if (!Number.isFinite(wholeCents) || !Number.isFinite(fractionCents)) return null;

  const cents = wholeCents + fractionCents;
  return negative ? -cents : cents;
}

export function parseQuantity(input: string): number | null {
  const normalised = (input ?? "").trim().replace(",", ".");
  if (normalised === "") return null;
  const value = Number.parseFloat(normalised);
  if (!Number.isFinite(value)) return null;
  // Three decimals, matching the column; more is silently meaningless precision.
  return Math.round(value * 1000) / 1000;
}

/* --------------------------------------------------------------- formatting */

const CURRENCY_LOCALE: Record<string, string> = { nl: "nl-NL", en: "en-IE", es: "es-ES" };

/**
 * Cents as money, in the invoice's own language.
 *
 * The same function serves the screen and the PDF, so the two cannot disagree about
 * where the thousands separator goes either.
 */
export function formatMoney(cents: Cents, locale = "nl", currency = "EUR"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[locale] ?? "nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** A quantity without trailing zeroes: 1, 2.5, 0.75. */
export function formatQuantity(quantity: number, locale = "nl"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[locale] ?? "nl-NL", {
    maximumFractionDigits: 3,
  }).format(quantity);
}

export function formatRate(rate: number, locale = "nl"): string {
  return (
    new Intl.NumberFormat(CURRENCY_LOCALE[locale] ?? "nl-NL", {
      maximumFractionDigits: 2,
    }).format(rate) + "%"
  );
}

/** The rates that are on the buttons. A custom rate is still accepted. */
export const VAT_RATES = [0, 4, 10, 21];
