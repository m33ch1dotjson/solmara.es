"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCopy } from "@/components/ui/LocaleProvider";
import { InvoiceStatusPill, type InvoiceDisplayStatus } from "./InvoiceStatusPill";
import s from "./InvoiceList.module.css";

export type InvoiceRow = {
  id: string;
  number: string | null;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  issueRaw: string;
  totalCents: number;
  amount: string;
  status: InvoiceDisplayStatus;
};

const FILTERS = ["ALL", "DRAFT", "FINALIZED", "SENT", "PAID", "OVERDUE"] as const;
const SORTS = ["NEWEST", "OLDEST", "NUMBER", "AMOUNT"] as const;

/**
 * The invoice book: search, filter, sort, and one row per invoice.
 *
 * A table on a desk and a stack of cards on a phone — the same markup, so there is
 * no second list to keep in step. Filtering happens here rather than on the server
 * because it answers while you type; when this list runs to thousands, the filter
 * moves into the query and nothing above this component changes.
 */
export function InvoiceList({ rows }: { rows: InvoiceRow[] }) {
  const { t } = useCopy();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("NEWEST");

  const filterLabel = t.invoices.filter as Record<string, string>;
  const sortLabel = t.invoices.sort as Record<string, string>;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matched = rows.filter((row) => {
      if (filter !== "ALL" && row.status !== filter) return false;
      if (needle === "") return true;
      return (
        (row.number ?? "").toLowerCase().includes(needle) ||
        row.customerName.toLowerCase().includes(needle) ||
        row.customerEmail.toLowerCase().includes(needle)
      );
    });

    const sorted = [...matched];
    if (sort === "NEWEST") sorted.sort((a, b) => b.issueRaw.localeCompare(a.issueRaw));
    if (sort === "OLDEST") sorted.sort((a, b) => a.issueRaw.localeCompare(b.issueRaw));
    if (sort === "NUMBER") sorted.sort((a, b) => (b.number ?? "").localeCompare(a.number ?? ""));
    if (sort === "AMOUNT") sorted.sort((a, b) => b.totalCents - a.totalCents);
    return sorted;
  }, [rows, query, filter, sort]);

  if (rows.length === 0) {
    return (
      <div className={s.empty}>
        <p className={s.emptyTitle}>{t.invoices.emptyTitle}</p>
        <p className={s.emptyBody}>{t.invoices.emptyBody}</p>
        <Link href="/admin/invoices/new" className={s.emptyButton}>
          <span aria-hidden="true">+</span> {t.invoices.newInvoice}
        </Link>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <div className={s.controls}>
        <input
          type="search"
          className={s.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.invoices.searchPlaceholder}
          aria-label={t.invoices.searchPlaceholder}
        />
        <label className={s.sortField}>
          <span className={s.sortLabel}>{t.invoices.sortBy}</span>
          <select
            className={s.select}
            value={sort}
            onChange={(event) => setSort(event.target.value as (typeof SORTS)[number])}
          >
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {sortLabel[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={s.filters} role="group" aria-label={t.invoices.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? `${s.chip} ${s.chipOn}` : s.chip}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {filterLabel[option]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={s.noMatch}>{t.invoices.noMatch}</p>
      ) : (
        <>
          {/* The desk: a real table, with real table semantics. */}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>{t.invoices.columnNumber}</th>
                  <th>{t.invoices.columnClient}</th>
                  <th>{t.invoices.columnIssued}</th>
                  <th>{t.invoices.columnDue}</th>
                  <th className={s.right}>{t.invoices.columnAmount}</th>
                  <th>{t.invoices.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/invoices/${row.id}`} className={s.numberLink}>
                        {row.number ?? t.invoices.noNumberYet}
                      </Link>
                    </td>
                    <td>
                      <span className={s.client}>{row.customerName || "—"}</span>
                      {row.customerEmail && <span className={s.sub}>{row.customerEmail}</span>}
                    </td>
                    <td className={s.muted}>{row.issueDate}</td>
                    <td className={s.muted}>{row.dueDate}</td>
                    <td className={`${s.right} ${s.amount}`}>{row.amount}</td>
                    <td>
                      <InvoiceStatusPill status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The phone: the same rows, stacked, with the amount where a thumb is. */}
          <div className={s.cards}>
            {shown.map((row) => (
              <Link key={row.id} href={`/admin/invoices/${row.id}`} className={s.card}>
                <span className={s.cardTop}>
                  <span className={s.cardNumber}>{row.number ?? t.invoices.noNumberYet}</span>
                  <InvoiceStatusPill status={row.status} />
                </span>
                <span className={s.cardClient}>{row.customerName || "—"}</span>
                <span className={s.cardFoot}>
                  <span className={s.sub}>
                    {row.issueDate} · {t.invoices.dueShort} {row.dueDate}
                  </span>
                  <span className={s.cardAmount}>{row.amount}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
