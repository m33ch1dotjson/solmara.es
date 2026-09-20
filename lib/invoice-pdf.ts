/*
 * The invoice, as a document.
 *
 * Input is one finalised invoice row and its lines — the snapshot, not the live
 * client or the current workspace settings. That is what makes regenerating a PDF
 * from 2026 in 2028 produce the same paper: this function cannot reach anything
 * that has changed in between, because it is never given it.
 *
 * Drawn with pdfkit rather than rendered from HTML. The alternative on this stack
 * is a headless browser, which means Chromium inside an LXC container, ~400MB of
 * dependency and a process that has to be kept alive and sandboxed to print a page
 * of text. This is a page of text.
 *
 * The standard PDF fonts are used with WinAnsi encoding, which covers Dutch and
 * Spanish accents and the euro sign. If a font with wider coverage is ever needed
 * (a client with a Greek or Cyrillic name), embed a TTF here; nothing else changes.
 */

import PDFDocument from "pdfkit";
import { formatMoney, formatQuantity, formatRate, invoiceTotals, type LineInput } from "@/lib/money";

type Locale = "nl" | "en" | "es";

export interface InvoicePdfInput {
  number: string;
  issueDate: string;
  dueDate: string;
  language: Locale;
  currency: string;

  customerName: string;
  customerCompanyName: string | null;
  customerEmail: string | null;
  customerTaxId: string | null;
  customerVatNumber: string | null;
  customerAddress: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  customerProvince: string | null;
  customerCountry: string | null;

  issuerLegalName: string | null;
  issuerDisplayName: string | null;
  issuerTaxId: string | null;
  issuerEmail: string | null;
  issuerPhone: string | null;
  issuerWebsite: string | null;
  issuerAddress: string | null;
  issuerPostalCode: string | null;
  issuerCity: string | null;
  issuerProvince: string | null;
  issuerCountry: string | null;
  issuerIban: string | null;
  issuerBic: string | null;
  issuerBankName: string | null;
  issuerAccountHolder: string | null;

  notes: string | null;
  paymentInstructions: string | null;

  lines: LineInput[];
  /** The company mark, already fetched. Null simply leaves it off. */
  logo: Buffer | null;
}

/*
 * The document's own vocabulary. Separate from lib/i18n.ts on purpose: that
 * dictionary is the interface, in the language the *reader of the portal* chose.
 * This is the language of one document, chosen per invoice, and it travels with the
 * invoice for years after. They are not the same setting and must not share a key.
 */
/** Fixed keys, so a lookup is a string and not string | undefined. */
interface Words {
  invoice: string;
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
  lineTotal: string;
  subtotal: string;
  total: string;
  payment: string;
  accountHolder: string;
  bank: string;
  iban: string;
  bic: string;
  notes: string;
  page: string;
  of: string;
}

const WORDS: Record<Locale, Words> = {
  nl: {
    invoice: "FACTUUR",
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
    lineTotal: "Bedrag",
    subtotal: "Subtotaal",
    total: "Totaal",
    payment: "Betaalgegevens",
    accountHolder: "Rekeninghouder",
    bank: "Bank",
    iban: "IBAN",
    bic: "BIC",
    notes: "Opmerkingen",
    page: "Pagina",
    of: "van",
  },
  en: {
    invoice: "INVOICE",
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
    lineTotal: "Amount",
    subtotal: "Subtotal",
    total: "Total",
    payment: "Payment details",
    accountHolder: "Account holder",
    bank: "Bank",
    iban: "IBAN",
    bic: "BIC",
    notes: "Notes",
    page: "Page",
    of: "of",
  },
  es: {
    invoice: "FACTURA",
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
    lineTotal: "Importe",
    subtotal: "Subtotal",
    total: "Total",
    payment: "Datos de pago",
    accountHolder: "Titular de la cuenta",
    bank: "Banco",
    iban: "IBAN",
    bic: "BIC",
    notes: "Observaciones",
    page: "Página",
    of: "de",
  },
};

const DATE_TAG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", es: "es-ES" };

function longDate(value: string, locale: Locale): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(DATE_TAG[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* The page. A4 in points, with a margin that leaves room to file it. */
const PAGE_WIDTH = 595.28;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 842 - MARGIN;

const INK = "#1b1d21";
const MUTED = "#6a6f78";
const RULE = "#d9dce1";

/** Column geometry for the line table, left to right. */
const COLS = {
  description: { x: MARGIN, width: 232 },
  quantity: { x: MARGIN + 240, width: 50 },
  unitPrice: { x: MARGIN + 296, width: 70 },
  vat: { x: MARGIN + 372, width: 44 },
  amount: { x: MARGIN + 422, width: CONTENT_WIDTH - 422 + MARGIN - MARGIN },
};

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const t = WORDS[input.language] ?? WORDS.nl;
  const money = (cents: number) => formatMoney(cents, input.language, input.currency);
  const totals = invoiceTotals(input.lines);

  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  /* ------------------------------------------------------------- the header */

  let y = MARGIN;

  if (input.logo) {
    try {
      doc.image(input.logo, MARGIN, y, { fit: [54, 54] });
    } catch {
      // A logo that will not decode must not cost us the invoice.
    }
  }

  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(input.issuerDisplayName || input.issuerLegalName || "", MARGIN + (input.logo ? 66 : 0), y + 14, {
      width: 240,
    });

  // The metadata block, right aligned, so the eye finds the number first.
  doc.font("Helvetica-Bold").fontSize(22).text(t.invoice, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  y += 40;
  const metaRows: Array<[string, string]> = [
    [t.number, input.number],
    [t.issueDate, longDate(input.issueDate, input.language)],
    [t.dueDate, longDate(input.dueDate, input.language)],
  ];
  for (const [label, value] of metaRows) {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, MARGIN + 250, y, {
      width: 150,
      align: "right",
    });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(value, MARGIN + 404, y, {
      width: CONTENT_WIDTH - 404 + MARGIN - MARGIN,
      align: "right",
    });
    y += 14;
  }

  y = Math.max(y, MARGIN + 86) + 18;

  /* ------------------------------------------------------- from and bill to */

  const addressLines = (lines: Array<string | null | undefined>) =>
    lines.map((line) => (line ?? "").trim()).filter((line) => line !== "");

  const fromBlock = addressLines([
    input.issuerLegalName,
    input.issuerAddress,
    [input.issuerPostalCode, input.issuerCity].filter(Boolean).join(" "),
    [input.issuerProvince, input.issuerCountry].filter(Boolean).join(", "),
    input.issuerTaxId ? `${t.taxId}: ${input.issuerTaxId}` : null,
    input.issuerEmail,
    input.issuerPhone,
    input.issuerWebsite,
  ]);

  const toBlock = addressLines([
    input.customerCompanyName,
    input.customerName,
    input.customerAddress,
    [input.customerPostalCode, input.customerCity].filter(Boolean).join(" "),
    [input.customerProvince, input.customerCountry].filter(Boolean).join(", "),
    input.customerTaxId ? `${t.taxId}: ${input.customerTaxId}` : null,
    input.customerVatNumber ? `${t.vatNumber}: ${input.customerVatNumber}` : null,
    input.customerEmail,
  ]);

  const columnWidth = (CONTENT_WIDTH - 30) / 2;
  const blockTop = y;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(t.from.toUpperCase(), MARGIN, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(MUTED)
    .text(t.billTo.toUpperCase(), MARGIN + columnWidth + 30, blockTop);

  y += 14;
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  doc.text(fromBlock.join("\n"), MARGIN, y, { width: columnWidth, lineGap: 2 });
  const fromBottom = doc.y;

  doc.text(toBlock.join("\n"), MARGIN + columnWidth + 30, y, { width: columnWidth, lineGap: 2 });
  y = Math.max(fromBottom, doc.y) + 24;

  /* -------------------------------------------------------------- the lines */

  function tableHeader(top: number): number {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
    doc.text(t.description.toUpperCase(), COLS.description.x, top, { width: COLS.description.width });
    doc.text(t.quantity.toUpperCase(), COLS.quantity.x, top, {
      width: COLS.quantity.width,
      align: "right",
    });
    doc.text(t.unitPrice.toUpperCase(), COLS.unitPrice.x, top, {
      width: COLS.unitPrice.width,
      align: "right",
    });
    doc.text(t.vat.toUpperCase(), COLS.vat.x, top, { width: COLS.vat.width, align: "right" });
    doc.text(t.lineTotal.toUpperCase(), COLS.amount.x, top, {
      width: COLS.amount.width,
      align: "right",
    });

    const ruleY = top + 13;
    doc.moveTo(MARGIN, ruleY).lineTo(PAGE_WIDTH - MARGIN, ruleY).strokeColor(RULE).lineWidth(0.8).stroke();
    return ruleY + 9;
  }

  y = tableHeader(y);

  input.lines.forEach((line, index) => {
    const amounts = totals.lines[index];
    if (!amounts) return;

    const descriptionHeight = doc
      .font("Helvetica")
      .fontSize(9.5)
      .heightOfString(line.description || "—", { width: COLS.description.width });
    const rowHeight = Math.max(descriptionHeight, 12) + 10;

    // A row is never split across two pages: half a line of an invoice on one page
    // and the money on the next is exactly the kind of thing that gets queried.
    if (y + rowHeight > BOTTOM - 40) {
      doc.addPage();
      y = tableHeader(MARGIN);
    }

    doc.fillColor(INK).font("Helvetica").fontSize(9.5);
    doc.text(line.description || "—", COLS.description.x, y, { width: COLS.description.width });
    doc.text(formatQuantity(line.quantity, input.language), COLS.quantity.x, y, {
      width: COLS.quantity.width,
      align: "right",
    });
    doc.text(money(line.unitPriceCents), COLS.unitPrice.x, y, {
      width: COLS.unitPrice.width,
      align: "right",
    });
    doc.text(formatRate(line.vatRate, input.language), COLS.vat.x, y, {
      width: COLS.vat.width,
      align: "right",
    });
    doc.text(money(amounts.subtotalCents), COLS.amount.x, y, {
      width: COLS.amount.width,
      align: "right",
    });

    y += rowHeight;
    doc.moveTo(MARGIN, y - 5).lineTo(PAGE_WIDTH - MARGIN, y - 5).strokeColor("#eef0f3").lineWidth(0.6).stroke();
  });

  /* ------------------------------------------------------------- the totals */

  const totalsRows: Array<[string, string, boolean]> = [
    [t.subtotal, money(totals.subtotalCents), false],
    ...totals.vatGroups.map(
      (group) =>
        [`${t.vat} ${formatRate(group.rate, input.language)}`, money(group.taxCents), false] as [
          string,
          string,
          boolean,
        ],
    ),
    [t.total, money(totals.totalCents), true],
  ];

  const totalsHeight = totalsRows.length * 16 + 20;
  if (y + totalsHeight > BOTTOM) {
    doc.addPage();
    y = MARGIN;
  }

  y += 10;
  const labelX = MARGIN + 300;
  const valueX = COLS.amount.x;

  for (const [label, value, strong] of totalsRows) {
    if (strong) {
      doc
        .moveTo(labelX, y - 4)
        .lineTo(PAGE_WIDTH - MARGIN, y - 4)
        .strokeColor(RULE)
        .lineWidth(0.8)
        .stroke();
      y += 6;
    }
    doc
      .font(strong ? "Helvetica-Bold" : "Helvetica")
      .fontSize(strong ? 11.5 : 9.5)
      .fillColor(strong ? INK : MUTED)
      .text(label, labelX, y, { width: 120, align: "right" });
    doc
      .font(strong ? "Helvetica-Bold" : "Helvetica")
      .fontSize(strong ? 11.5 : 9.5)
      .fillColor(INK)
      .text(value, valueX, y, { width: COLS.amount.width, align: "right" });
    y += strong ? 20 : 15;
  }

  /* ----------------------------------------------- payment details and notes */

  const paymentLines = addressLines([
    input.issuerAccountHolder ? `${t.accountHolder}: ${input.issuerAccountHolder}` : null,
    input.issuerBankName ? `${t.bank}: ${input.issuerBankName}` : null,
    input.issuerIban ? `${t.iban}: ${input.issuerIban}` : null,
    input.issuerBic ? `${t.bic}: ${input.issuerBic}` : null,
    input.paymentInstructions,
  ]);

  if (paymentLines.length > 0 || input.notes) {
    const blockHeight = (paymentLines.length + (input.notes ? 3 : 0)) * 13 + 50;
    if (y + blockHeight > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }

    y += 16;

    if (paymentLines.length > 0) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(t.payment.toUpperCase(), MARGIN, y);
      y += 13;
      doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(paymentLines.join("\n"), MARGIN, y, {
        width: columnWidth + 60,
        lineGap: 2,
      });
      y = doc.y + 14;
    }

    if (input.notes) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(t.notes.toUpperCase(), MARGIN, y);
      y += 13;
      doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(input.notes, MARGIN, y, {
        width: CONTENT_WIDTH,
        lineGap: 2,
      });
    }
  }

  /* --------------------------------------------------------- page numbering */

  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page += 1) {
    doc.switchToPage(range.start + page);

    // The footer sits below the bottom margin, and writing there is what pdfkit
    // treats as "this page is full" — it helpfully starts another one, and the
    // invoice ends with a blank page carrying nothing but its own page number.
    // Dropping the margin for the width of this one line is the documented way out.
    doc.page.margins.bottom = 0;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${input.number}   ·   ${t.page} ${page + 1} ${t.of} ${range.count}`,
        MARGIN,
        BOTTOM + 12,
        { width: CONTENT_WIDTH, align: "center" },
      );
  }

  doc.end();
  return finished;
}

/** SOL-2026-001.pdf — predictable, safe on every filesystem. */
export function invoiceFilename(number: string): string {
  return `${number.replace(/[^A-Za-z0-9-_]/g, "")}.pdf`;
}
