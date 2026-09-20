"use client";

import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./InvoiceList.module.css";

export type InvoiceDisplayStatus =
  | "DRAFT"
  | "FINALIZED"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

/**
 * The status, as a word with a quiet colour behind it.
 *
 * The word is always there. Colour alone would leave anyone who does not separate
 * red from green reading a table of grey pills, and this one is about money.
 */
export function InvoiceStatusPill({ status }: { status: InvoiceDisplayStatus }) {
  const { t } = useCopy();
  const labels = t.invoices.status as Record<string, string>;

  // A CSS module's keys are typed `string | undefined`, hence the fallbacks.
  const tone: Record<InvoiceDisplayStatus, string | undefined> = {
    DRAFT: s.toneDraft,
    FINALIZED: s.toneFinal,
    SENT: s.toneSent,
    PAID: s.tonePaid,
    OVERDUE: s.toneOverdue,
    CANCELLED: s.toneCancelled,
  };

  return (
    <span className={[s.pill, tone[status]].filter(Boolean).join(" ")}>
      {labels[status] ?? status}
    </span>
  );
}
