"use client";

import Link from "next/link";
import { useCopy } from "@/components/ui/LocaleProvider";
import { InvoiceStatusPill, type InvoiceDisplayStatus } from "./InvoiceStatusPill";
import s from "./ClientInvoices.module.css";

/**
 * This client's invoices, on their own page, with the shortcut that starts a new
 * one with them already filled in.
 *
 * Deliberately short: number, amount, date, status. Anything more and it becomes a
 * second invoice list to keep in step with the real one.
 */
export function ClientInvoices({
  clientId,
  rows,
}: {
  clientId: string;
  rows: Array<{
    id: string;
    number: string | null;
    amount: string;
    issued: string;
    status: InvoiceDisplayStatus;
  }>;
}) {
  const { t } = useCopy();

  return (
    <div className={s.wrap}>
      {rows.length === 0 ? (
        <p className={s.empty}>{t.invoices.noneForClient}</p>
      ) : (
        <ul className={s.list}>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/invoices/${row.id}`} className={s.row}>
                <span className={s.number}>{row.number ?? t.invoices.noNumberYet}</span>
                <span className={s.amount}>{row.amount}</span>
                <span className={s.date}>{row.issued}</span>
                <InvoiceStatusPill status={row.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/admin/invoices/new?client=${clientId}`} className={s.create}>
        <span aria-hidden="true">+</span> {t.invoices.createForClient}
      </Link>
    </div>
  );
}
