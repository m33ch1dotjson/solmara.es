"use client";

import { formatMoney, formatQuantity, formatRate, invoiceTotals, type LineInput } from "@/lib/money";
import type { EditorIssuer } from "./InvoiceEditor";
import s from "./InvoicePreview.module.css";

type Locale = "nl" | "en" | "es";

/*
 * The invoice as it will look, on screen.
 *
 * Deliberately the same content and the same order as lib/invoice-pdf.ts, and the
 * same arithmetic — both call invoiceTotals. It is not the same renderer, because
 * one draws on paper and the other in a browser; what must not differ is the
 * numbers, and those come from one function.
 *
 * A draft says DRAFT across the top. A preview that could be mistaken for the real
 * document is how an unnumbered invoice ends up in somebody's inbox.
 */

/** Fixed keys, so a lookup is a string and not string | undefined. */
interface Words {
  invoice: string;
  draft: string;
  number: string;
  issueDate: string;
  dueDate: string;
  from: string;
  billTo: string;
  taxId: string;
  vatNumber: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vat: string;
  amount: string;
  subtotal: string;
  total: string;
  payment: string;
  notes: string;
  noNumber: string;
}

const WORDS: Record<Locale, Words> = {
  nl: {
    invoice: "FACTUUR",
    draft: "CONCEPT",
    number: "Factuurnummer",
    issueDate: "Factuurdatum",
    dueDate: "Vervaldatum",
    from: "Van",
    billTo: "Aan",
    taxId: "Fiscaal nummer",
    vatNumber: "Btw-nummer",
    description: "Omschrijving",
    quantity: "Aantal",
    unitPrice: "Prijs",
    vat: "Btw",
    amount: "Bedrag",
    subtotal: "Subtotaal",
    total: "Totaal",
    payment: "Betaalgegevens",
    notes: "Opmerkingen",
    noNumber: "wordt toegekend bij definitief maken",
  },
  en: {
    invoice: "INVOICE",
    draft: "DRAFT",
    number: "Invoice number",
    issueDate: "Invoice date",
    dueDate: "Due date",
    from: "From",
    billTo: "Bill to",
    taxId: "Tax ID",
    vatNumber: "VAT number",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Price",
    vat: "VAT",
    amount: "Amount",
    subtotal: "Subtotal",
    total: "Total",
    payment: "Payment details",
    notes: "Notes",
    noNumber: "assigned when the invoice is finalised",
  },
  es: {
    invoice: "FACTURA",
    draft: "BORRADOR",
    number: "Número de factura",
    issueDate: "Fecha de factura",
    dueDate: "Fecha de vencimiento",
    from: "De",
    billTo: "Para",
    taxId: "NIF / NIE",
    vatNumber: "Número de IVA",
    description: "Descripción",
    quantity: "Cantidad",
    unitPrice: "Precio",
    vat: "IVA",
    amount: "Importe",
    subtotal: "Subtotal",
    total: "Total",
    payment: "Datos de pago",
    notes: "Observaciones",
    noNumber: "se asigna al finalizar la factura",
  },
};

const DATE_TAG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", es: "es-ES" };

function longDate(value: string, locale: Locale): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString(DATE_TAG[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function InvoicePreview({
  draft,
  number,
  language,
  currency,
  issueDate,
  dueDate,
  customer,
  issuer,
  lines,
  notes,
  paymentInstructions,
}: {
  draft: boolean;
  number: string | null;
  language: Locale;
  currency: string;
  issueDate: string;
  dueDate: string;
  customer: {
    name: string;
    companyName: string;
    email: string;
    taxId: string;
    vatNumber: string;
    address: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  issuer: EditorIssuer;
  lines: LineInput[];
  notes: string;
  paymentInstructions: string;
}) {
  const t = WORDS[language] ?? WORDS.nl;
  const totals = invoiceTotals(lines);
  const money = (cents: number) => formatMoney(cents, language, currency);

  const fromLines = [
    issuer.legalName,
    issuer.address,
    [issuer.postalCode, issuer.city].filter(Boolean).join(" "),
    [issuer.province, issuer.country].filter(Boolean).join(", "),
    issuer.taxId ? `${t.taxId}: ${issuer.taxId}` : null,
    issuer.email,
    issuer.phone,
  ].filter((line): line is string => Boolean(line && line.trim()));

  const toLines = [
    customer.companyName,
    customer.name,
    customer.address,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
    [customer.province, customer.country].filter(Boolean).join(", "),
    customer.taxId ? `${t.taxId}: ${customer.taxId}` : null,
    customer.vatNumber ? `${t.vatNumber}: ${customer.vatNumber}` : null,
    customer.email,
  ].filter((line): line is string => Boolean(line && line.trim()));

  const paymentLines = [
    issuer.accountHolder,
    issuer.bankName,
    issuer.iban ? `IBAN: ${issuer.iban}` : null,
    issuer.bic ? `BIC: ${issuer.bic}` : null,
    paymentInstructions,
  ].filter((line): line is string => Boolean(line && line.trim()));

  return (
    <div className={s.sheet}>
      {draft && <p className={s.draftMark}>{t.draft}</p>}

      <div className={s.head}>
        <div className={s.brand}>
          {issuer.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={issuer.logoUrl} alt="" className={s.logo} />
          )}
          <span className={s.issuerName}>{issuer.displayName || issuer.legalName || ""}</span>
        </div>

        <div className={s.meta}>
          <p className={s.docTitle}>{t.invoice}</p>
          <dl className={s.metaList}>
            <div>
              <dt>{t.number}</dt>
              <dd className={number ? s.metaStrong : s.metaMuted}>{number ?? t.noNumber}</dd>
            </div>
            <div>
              <dt>{t.issueDate}</dt>
              <dd>{longDate(issueDate, language)}</dd>
            </div>
            <div>
              <dt>{t.dueDate}</dt>
              <dd>{longDate(dueDate, language)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={s.parties}>
        <div>
          <p className={s.partyLabel}>{t.from}</p>
          <p className={s.partyBody}>{fromLines.join("\n")}</p>
        </div>
        <div>
          <p className={s.partyLabel}>{t.billTo}</p>
          <p className={s.partyBody}>{toLines.join("\n") || "—"}</p>
        </div>
      </div>

      <table className={s.table}>
        <thead>
          <tr>
            <th>{t.description}</th>
            <th className={s.right}>{t.quantity}</th>
            <th className={s.right}>{t.unitPrice}</th>
            <th className={s.right}>{t.vat}</th>
            <th className={s.right}>{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td>{line.description || "—"}</td>
              <td className={s.right}>{formatQuantity(line.quantity, language)}</td>
              <td className={s.right}>{money(line.unitPriceCents)}</td>
              <td className={s.right}>{formatRate(line.vatRate, language)}</td>
              <td className={`${s.right} ${s.mono}`}>
                {money(totals.lines[index]?.subtotalCents ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={s.totals}>
        <div className={s.totalRow}>
          <span>{t.subtotal}</span>
          <span className={s.mono}>{money(totals.subtotalCents)}</span>
        </div>
        {totals.vatGroups.map((group) => (
          <div className={s.totalRow} key={group.rate}>
            <span>
              {t.vat} {formatRate(group.rate, language)}
            </span>
            <span className={s.mono}>{money(group.taxCents)}</span>
          </div>
        ))}
        <div className={`${s.totalRow} ${s.grand}`}>
          <span>{t.total}</span>
          <span className={s.mono}>{money(totals.totalCents)}</span>
        </div>
      </div>

      {paymentLines.length > 0 && (
        <div className={s.block}>
          <p className={s.partyLabel}>{t.payment}</p>
          <p className={s.partyBody}>{paymentLines.join("\n")}</p>
        </div>
      )}

      {notes.trim() !== "" && (
        <div className={s.block}>
          <p className={s.partyLabel}>{t.notes}</p>
          <p className={s.partyBody}>{notes}</p>
        </div>
      )}
    </div>
  );
}
