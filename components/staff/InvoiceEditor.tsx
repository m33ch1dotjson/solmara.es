"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  deleteInvoiceAction,
  finalizeInvoiceAction,
  saveInvoiceAction,
} from "@/app/admin/invoices/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import type { Locale } from "@/lib/brand";
import { LOCALE_NAME, LOCALES } from "@/lib/i18n";
import {
  formatMoney,
  invoiceTotals,
  parseAmountToCents,
  parseQuantity,
  VAT_RATES,
  type LineInput,
} from "@/lib/money";
import { InvoicePreview } from "./InvoicePreview";
import a from "@/app/admin/account/account.module.css";
import s from "./InvoiceEditor.module.css";

export type PickerClient = {
  id: string;
  code: string;
  name: string;
  email: string;
  preferredLocale: Locale;
  address: string | null;
  country: string | null;
};

export type EditorIssuer = {
  legalName: string | null;
  displayName: string | null;
  taxId: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  accountHolder: string | null;
  logoUrl: string | null;
};

export type EditorDraft = {
  id: string | null;
  clientId: string | null;
  issueDate: string;
  dueDate: string;
  language: Locale;
  currency: string;
  notes: string;
  paymentInstructions: string;
  customerName: string;
  customerCompanyName: string;
  customerEmail: string;
  customerTaxId: string;
  customerVatNumber: string;
  customerAddress: string;
  customerPostalCode: string;
  customerCity: string;
  customerProvince: string;
  customerCountry: string;
  lines: Array<{ description: string; quantity: string; unitPrice: string; vatRate: string }>;
};

/*
 * Not exported. A plain value imported out of a "use client" module into a server
 * component arrives as a client reference, not the object — spreading it gives {},
 * and the first line of a new invoice then has no quantity at all. The page writes
 * its own starting line instead.
 */
const emptyLine = { description: "", quantity: "1", unitPrice: "", vatRate: "21" };

/**
 * The invoice editor.
 *
 * Amounts are typed as text and parsed on every keystroke, so "1.234,56" and
 * "1234.56" both mean the same thing and neither turns into a float on the way to
 * the server. What the totals show here is the same arithmetic the server will do
 * when it stores the invoice and the same the PDF will do when it prints it —
 * literally, the same function.
 */
export function InvoiceEditor({
  draft,
  clients,
  issuer,
}: {
  draft: EditorDraft;
  clients: PickerClient[];
  issuer: EditorIssuer;
}) {
  const { t } = useCopy();
  const router = useRouter();

  const [form, setForm] = useState(draft);
  const [clientQuery, setClientQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  /* The same calculation as the server and the PDF. Not a second implementation. */
  const parsedLines: LineInput[] = useMemo(
    () =>
      form.lines.map((line) => ({
        description: line.description,
        quantity: parseQuantity(line.quantity) ?? 0,
        unitPriceCents: parseAmountToCents(line.unitPrice) ?? 0,
        vatRate: Number(line.vatRate.replace(",", ".")) || 0,
      })),
    [form.lines],
  );

  const totals = useMemo(() => invoiceTotals(parsedLines), [parsedLines]);
  const money = (cents: number) => formatMoney(cents, form.language, form.currency);

  const matches = useMemo(() => {
    const needle = clientQuery.trim().toLowerCase();
    if (needle === "") return clients.slice(0, 8);
    return clients
      .filter(
        (row) =>
          row.name.toLowerCase().includes(needle) ||
          row.email.toLowerCase().includes(needle) ||
          row.code.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [clients, clientQuery]);

  function set<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  /*
   * Picking a client copies their details onto the invoice. It is a copy, not a
   * link: from here the invoice carries its own recipient, which is what keeps an
   * old invoice correct after somebody moves house. Everything stays editable.
   */
  function chooseClient(row: PickerClient) {
    setForm((current) => ({
      ...current,
      clientId: row.id,
      customerName: row.name,
      customerEmail: row.email,
      customerAddress: row.address ?? current.customerAddress,
      customerCountry: row.country ?? current.customerCountry,
      language: row.preferredLocale ?? current.language,
    }));
    setPickerOpen(false);
    setMessage(null);
  }

  function setLine(index: number, key: keyof (typeof form.lines)[number], value: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, i) => (i === index ? { ...line, [key]: value } : line)),
    }));
    setMessage(null);
  }

  function payload() {
    const data = new FormData();
    if (form.id) data.set("id", form.id);
    data.set("clientId", form.clientId ?? "");
    data.set("issueDate", form.issueDate);
    data.set("dueDate", form.dueDate);
    data.set("language", form.language);
    data.set("currency", form.currency);
    data.set("notes", form.notes);
    data.set("paymentInstructions", form.paymentInstructions);
    data.set("customerName", form.customerName);
    data.set("customerCompanyName", form.customerCompanyName);
    data.set("customerEmail", form.customerEmail);
    data.set("customerTaxId", form.customerTaxId);
    data.set("customerVatNumber", form.customerVatNumber);
    data.set("customerAddress", form.customerAddress);
    data.set("customerPostalCode", form.customerPostalCode);
    data.set("customerCity", form.customerCity);
    data.set("customerProvince", form.customerProvince);
    data.set("customerCountry", form.customerCountry);
    data.set(
      "lines",
      JSON.stringify(
        parsedLines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          vatRate: line.vatRate,
        })),
      ),
    );
    return data;
  }

  function save(then?: (id: string) => void) {
    setMessage(null);
    start(async () => {
      const result = await saveInvoiceAction(payload());
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      const id = result.id ?? form.id;
      if (id && !form.id) {
        // The draft has a home now; the address bar should say so.
        setForm((current) => ({ ...current, id }));
        router.replace(`/admin/invoices/${id}`);
      }
      setMessage({ ok: true, text: result.message ?? "" });
      if (id) then?.(id);
      router.refresh();
    });
  }

  function finalize() {
    setConfirming(false);
    // Save first, always: what is on screen is what should be frozen, and the
    // server finalises what is in the database, not what is in the browser.
    save((id) => {
      start(async () => {
        const data = new FormData();
        data.set("id", id);
        const result = await finalizeInvoiceAction(data);
        setMessage(
          result.ok
            ? { ok: true, text: result.message ?? "" }
            : { ok: false, text: result.error },
        );
        if (result.ok) router.refresh();
      });
    });
  }

  function destroy() {
    if (!form.id) return;
    start(async () => {
      const data = new FormData();
      data.set("id", form.id as string);
      await deleteInvoiceAction(data);
    });
  }

  const canFinalize =
    form.customerName.trim() !== "" &&
    parsedLines.length > 0 &&
    parsedLines.every((line) => line.quantity > 0);

  return (
    <div className={s.editor}>
      {/* ------------------------------------------------------------ client */}
      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.invoices.customer}</h2>
        <p className={a.cardLead}>{t.invoices.customerLead}</p>

        <div className={s.clientRow}>
          <button type="button" className={a.ghost} onClick={() => setPickerOpen(true)}>
            {form.clientId ? t.invoices.changeClient : t.invoices.pickClient}
          </button>
          {form.clientId && <span className={s.linked}>{t.invoices.linked}</span>}
        </div>

        <div className={a.fields}>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.customerName}</span>
            <input
              className={a.input}
              value={form.customerName}
              onChange={(event) => set("customerName", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.companyName}</span>
            <input
              className={a.input}
              value={form.customerCompanyName}
              onChange={(event) => set("customerCompanyName", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.common.email}</span>
            <input
              className={a.input}
              type="email"
              value={form.customerEmail}
              onChange={(event) => set("customerEmail", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.taxId}</span>
            <input
              className={a.input}
              value={form.customerTaxId}
              onChange={(event) => set("customerTaxId", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.vatNumber}</span>
            <input
              className={a.input}
              value={form.customerVatNumber}
              onChange={(event) => set("customerVatNumber", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.address}</span>
            <input
              className={a.input}
              value={form.customerAddress}
              onChange={(event) => set("customerAddress", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.postalCode}</span>
            <input
              className={a.input}
              value={form.customerPostalCode}
              onChange={(event) => set("customerPostalCode", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.city}</span>
            <input
              className={a.input}
              value={form.customerCity}
              onChange={(event) => set("customerCity", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.province}</span>
            <input
              className={a.input}
              value={form.customerProvince}
              onChange={(event) => set("customerProvince", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.country}</span>
            <input
              className={a.input}
              value={form.customerCountry}
              onChange={(event) => set("customerCountry", event.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ------------------------------------------------------------- dates */}
      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.invoices.details}</h2>
        <div className={a.fields}>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.issueDate}</span>
            <input
              className={a.input}
              type="date"
              value={form.issueDate}
              onChange={(event) => set("issueDate", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.dueDate}</span>
            <input
              className={a.input}
              type="date"
              value={form.dueDate}
              onChange={(event) => set("dueDate", event.target.value)}
            />
          </label>
          <label className={a.field}>
            <span className={a.label}>{t.invoices.language}</span>
            <select
              className={a.select}
              value={form.language}
              onChange={(event) => set("language", event.target.value as Locale)}
            >
              {LOCALES.map((option) => (
                <option key={option} value={option}>
                  {LOCALE_NAME[option]}
                </option>
              ))}
            </select>
            <span className={a.hint}>{t.invoices.languageHint}</span>
          </label>
        </div>
      </section>

      {/* ------------------------------------------------------------- lines */}
      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.invoices.lines}</h2>

        <div className={s.lines}>
          <div className={s.lineHead} aria-hidden="true">
            <span>{t.invoices.description}</span>
            <span className={s.num}>{t.invoices.quantity}</span>
            <span className={s.num}>{t.invoices.unitPrice}</span>
            <span className={s.num}>{t.invoices.vat}</span>
            <span className={s.num}>{t.invoices.lineTotal}</span>
            <span />
          </div>

          {form.lines.map((line, index) => (
            <div className={s.line} key={index}>
              <label className={s.cell}>
                <span className={s.mobileLabel}>{t.invoices.description}</span>
                <input
                  className={a.input}
                  value={line.description}
                  onChange={(event) => setLine(index, "description", event.target.value)}
                />
              </label>
              <label className={`${s.cell} ${s.num}`}>
                <span className={s.mobileLabel}>{t.invoices.quantity}</span>
                <input
                  className={a.input}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => setLine(index, "quantity", event.target.value)}
                />
              </label>
              <label className={`${s.cell} ${s.num}`}>
                <span className={s.mobileLabel}>{t.invoices.unitPrice}</span>
                <input
                  className={a.input}
                  inputMode="decimal"
                  value={line.unitPrice}
                  onChange={(event) => setLine(index, "unitPrice", event.target.value)}
                />
              </label>
              <label className={`${s.cell} ${s.num}`}>
                <span className={s.mobileLabel}>{t.invoices.vat}</span>
                <select
                  className={a.select}
                  value={line.vatRate}
                  onChange={(event) => setLine(index, "vatRate", event.target.value)}
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate} value={String(rate)}>
                      {rate}%
                    </option>
                  ))}
                  {/* A rate that came from somewhere else stays selectable. */}
                  {!VAT_RATES.includes(Number(line.vatRate)) && (
                    <option value={line.vatRate}>{line.vatRate}%</option>
                  )}
                </select>
              </label>
              <span className={`${s.cell} ${s.num} ${s.lineTotal}`}>
                <span className={s.mobileLabel}>{t.invoices.lineTotal}</span>
                {money(totals.lines[index]?.totalCents ?? 0)}
              </span>
              <button
                type="button"
                className={s.removeLine}
                aria-label={t.common.delete}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    lines: current.lines.filter((_, i) => i !== index),
                  }))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className={a.actions}>
          <button
            type="button"
            className={a.ghost}
            onClick={() =>
              setForm((current) => ({ ...current, lines: [...current.lines, { ...emptyLine }] }))
            }
          >
            <span aria-hidden="true">+</span> {t.invoices.addLine}
          </button>
        </div>

        <div className={s.totals}>
          <div className={s.totalRow}>
            <span>{t.invoices.subtotal}</span>
            <span className={s.totalValue}>{money(totals.subtotalCents)}</span>
          </div>
          {totals.vatGroups.map((group) => (
            <div className={s.totalRow} key={group.rate}>
              <span>
                {t.invoices.vat} {group.rate}%
              </span>
              <span className={s.totalValue}>{money(group.taxCents)}</span>
            </div>
          ))}
          <div className={`${s.totalRow} ${s.grandTotal}`}>
            <span>{t.invoices.total}</span>
            <span className={s.totalValue}>{money(totals.totalCents)}</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- notes */}
      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.invoices.notes}</h2>
        <label className={a.field}>
          <span className={a.label}>{t.invoices.notesLabel}</span>
          <textarea
            className={s.textarea}
            rows={3}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </label>
        <label className={a.field}>
          <span className={a.label}>{t.invoices.paymentInstructions}</span>
          <textarea
            className={s.textarea}
            rows={2}
            value={form.paymentInstructions}
            onChange={(event) => set("paymentInstructions", event.target.value)}
          />
          <span className={a.hint}>{t.invoices.paymentHint}</span>
        </label>
      </section>

      {/* ----------------------------------------------------------- actions */}
      <div className={s.bar}>
        <button type="button" className={a.ghost} onClick={() => save()} disabled={pending}>
          {pending ? t.common.busy : t.invoices.saveDraft}
        </button>
        <button type="button" className={a.ghost} onClick={() => setPreviewOpen(true)}>
          {t.invoices.preview}
        </button>
        <button
          type="button"
          className={a.primary}
          disabled={pending || !canFinalize}
          onClick={() => setConfirming(true)}
        >
          {t.invoices.finalize}
        </button>
        {form.id && (
          <button type="button" className={s.deleteLink} onClick={() => setDeleting(true)}>
            {t.invoices.deleteDraft}
          </button>
        )}
        {message && <span className={message.ok ? a.ok : a.error}>{message.text}</span>}
      </div>

      {!canFinalize && <p className={s.hintLine}>{t.invoices.finalizeHint}</p>}

      {/* ----------------------------------------------------------- dialogs */}
      {pickerOpen && (
        <Modal title={t.invoices.pickClient} onClose={() => setPickerOpen(false)}>
          <input
            className={a.input}
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder={t.invoices.searchClients}
            aria-label={t.invoices.searchClients}
          />
          <div className={s.pickList}>
            {matches.length === 0 ? (
              <p className={a.cardLead}>{t.invoices.noClients}</p>
            ) : (
              matches.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={s.pickRow}
                  onClick={() => chooseClient(row)}
                >
                  <span className={s.pickName}>{row.name}</span>
                  <span className={s.pickMeta}>
                    {row.code} · {row.email}
                  </span>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {previewOpen && (
        <Modal title={t.invoices.preview} onClose={() => setPreviewOpen(false)}>
          <InvoicePreview
            draft
            number={null}
            language={form.language}
            currency={form.currency}
            issueDate={form.issueDate}
            dueDate={form.dueDate}
            customer={{
              name: form.customerName,
              companyName: form.customerCompanyName,
              email: form.customerEmail,
              taxId: form.customerTaxId,
              vatNumber: form.customerVatNumber,
              address: form.customerAddress,
              postalCode: form.customerPostalCode,
              city: form.customerCity,
              province: form.customerProvince,
              country: form.customerCountry,
            }}
            issuer={issuer}
            lines={parsedLines}
            notes={form.notes}
            paymentInstructions={form.paymentInstructions}
          />
        </Modal>
      )}

      {confirming && (
        <Modal title={t.invoices.finalizeTitle} onClose={() => setConfirming(false)}>
          <p className={a.cardLead}>{t.invoices.finalizeBody}</p>
          <div className={a.actions}>
            <button type="button" className={a.ghost} onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </button>
            <button type="button" className={a.primary} onClick={finalize} disabled={pending}>
              {pending ? t.common.busy : t.invoices.finalize}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title={t.invoices.deleteDraft} onClose={() => setDeleting(false)}>
          <p className={a.cardLead}>{t.invoices.deleteBody}</p>
          <div className={a.actions}>
            <button type="button" className={a.ghost} onClick={() => setDeleting(false)}>
              {t.common.cancel}
            </button>
            <button type="button" className={s.dangerButton} onClick={destroy} disabled={pending}>
              {pending ? t.common.busy : t.common.confirmDelete}
            </button>
          </div>
        </Modal>
      )}

      <p className={s.backRow}>
        <Link href="/admin/invoices" className={s.back}>
          {t.invoices.backToList}
        </Link>
      </p>
    </div>
  );
}
