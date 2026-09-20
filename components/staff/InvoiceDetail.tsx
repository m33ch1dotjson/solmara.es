"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markPaidAction,
  markSentAction,
  regeneratePdfAction,
} from "@/app/admin/invoices/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import type { LineInput } from "@/lib/money";
import { InvoicePreview } from "./InvoicePreview";
import { InvoiceStatusPill, type InvoiceDisplayStatus } from "./InvoiceStatusPill";
import type { EditorIssuer } from "./InvoiceEditor";
import a from "@/app/admin/account/account.module.css";
import s from "./InvoiceDetail.module.css";

const METHODS = ["TRANSFER", "CASH", "CARD", "OTHER"] as const;

/**
 * A finalised invoice: what it says, what it is worth, and what may still happen
 * to it.
 *
 * There is no edit button, and that is the feature. A finalised invoice is a
 * historical document; if it is wrong the answer is a credit note, which is the
 * next thing to build, not a field somebody quietly retypes.
 */
export function InvoiceDetail({
  id,
  number,
  status,
  clientId,
  issueDate,
  dueDate,
  subtotal,
  taxTotal,
  total,
  hasPdf,
  timeline,
  preview,
}: {
  id: string;
  number: string;
  status: InvoiceDisplayStatus;
  clientId: string | null;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  hasPdf: boolean;
  timeline: Array<{ when: string; what: string; who: string | null }>;
  preview: {
    number: string | null;
    language: "nl" | "en" | "es";
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
  };
}) {
  const { t } = useCopy();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<string>("TRANSFER");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(action: (form: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>, fill?: (form: FormData) => void) {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      fill?.(form);
      const result = await action(form);
      setMessage(
        result.ok
          ? { ok: true, text: result.message ?? "" }
          : { ok: false, text: result.error ?? "" },
      );
      if (result.ok) router.refresh();
    });
  }

  const canMarkSent = status === "FINALIZED";
  const canMarkPaid = status === "FINALIZED" || status === "SENT" || status === "OVERDUE";

  return (
    <div className={s.page}>
      <div className={s.top}>
        <Link href="/admin/invoices" className={s.back}>
          {t.invoices.backToList}
        </Link>
      </div>

      <div className={s.head}>
        <div>
          <h1 className={s.number}>{number}</h1>
          <p className={s.dates}>
            {t.invoices.issueDate}: {issueDate} · {t.invoices.dueDate}: {dueDate}
          </p>
        </div>
        <InvoiceStatusPill status={status} />
      </div>

      <div className={s.actions}>
        {hasPdf ? (
          <>
            <a
              className={a.primary}
              href={`/admin/invoices/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              {t.invoices.viewPdf}
            </a>
            <a className={a.ghost} href={`/admin/invoices/${id}/pdf`} download>
              {t.invoices.downloadPdf}
            </a>
          </>
        ) : (
          <>
            <span className={s.warn}>{t.invoices.pdfMissing}</span>
            <button
              type="button"
              className={a.ghost}
              disabled={pending}
              onClick={() => run(regeneratePdfAction)}
            >
              {pending ? t.common.busy : t.invoices.makePdf}
            </button>
          </>
        )}

        {canMarkSent && (
          <button
            type="button"
            className={a.ghost}
            disabled={pending}
            onClick={() => run(markSentAction)}
          >
            {t.invoices.markSent}
          </button>
        )}

        {canMarkPaid && (
          <button type="button" className={a.ghost} onClick={() => setPaying(true)}>
            {t.invoices.markPaid}
          </button>
        )}

        {clientId && (
          <Link href={`/admin/clients/${clientId}`} className={a.ghost}>
            {t.invoices.openClient}
          </Link>
        )}

        {message && <span className={message.ok ? a.ok : a.error}>{message.text}</span>}
      </div>

      <div className={s.columns}>
        <section className={`${a.card} ${s.document}`}>
          <InvoicePreview
            draft={false}
            number={preview.number}
            language={preview.language}
            currency={preview.currency}
            issueDate={preview.issueDate}
            dueDate={preview.dueDate}
            customer={preview.customer}
            issuer={preview.issuer}
            lines={preview.lines}
            notes={preview.notes}
            paymentInstructions={preview.paymentInstructions}
          />
        </section>

        <div className={s.side}>
          <section className={a.card}>
            <h2 className={a.cardTitle}>{t.invoices.amounts}</h2>
            <dl className={s.amounts}>
              <div>
                <dt>{t.invoices.subtotal}</dt>
                <dd>{subtotal}</dd>
              </div>
              <div>
                <dt>{t.invoices.vat}</dt>
                <dd>{taxTotal}</dd>
              </div>
              <div className={s.grand}>
                <dt>{t.invoices.total}</dt>
                <dd>{total}</dd>
              </div>
            </dl>
          </section>

          <section className={a.card}>
            <h2 className={a.cardTitle}>{t.invoices.history}</h2>
            <ol className={s.timeline}>
              {timeline.map((entry, index) => (
                <li key={index}>
                  <span className={s.eventWhen}>{entry.when}</span>
                  <span className={s.eventWhat}>
                    {entry.what}
                    {entry.who ? ` · ${entry.who}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={a.card}>
            <h2 className={a.cardTitle}>{t.invoices.locked}</h2>
            <p className={a.cardLead}>{t.invoices.lockedBody}</p>
          </section>
        </div>
      </div>

      {paying && (
        <Modal title={t.invoices.markPaid} onClose={() => setPaying(false)}>
          <div className={a.fields}>
            <label className={a.field}>
              <span className={a.label}>{t.invoices.paymentMethod}</span>
              <select
                className={a.select}
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {METHODS.map((option) => (
                  <option key={option} value={option}>
                    {(t.invoices.method as Record<string, string>)[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.invoices.paymentReference}</span>
              <input
                className={a.input}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </label>
          </div>
          <div className={a.actions}>
            <button type="button" className={a.ghost} onClick={() => setPaying(false)}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className={a.primary}
              disabled={pending}
              onClick={() => {
                setPaying(false);
                run(markPaidAction, (form) => {
                  form.set("method", method);
                  form.set("reference", reference);
                });
              }}
            >
              {pending ? t.common.busy : t.invoices.markPaid}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
