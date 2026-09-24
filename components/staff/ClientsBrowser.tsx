"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { setClientsViewAction } from "@/app/admin/clients/client-actions";
import type { AccountStatus } from "@/lib/access";
import { Avatar } from "@/components/ui/Avatar";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import { NewClientButton } from "./NewClientButton";
import s from "./ClientsBrowser.module.css";

export type ClientRow = {
  id: string;
  code: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  companyName: string;
  place: string;
  status: "INVITED" | "ACTIVE" | "CLOSED";
  /** Whether they can sign in — see lib/access.ts. Not the same as status. */
  access: AccountStatus;
  /** When the outstanding invite runs out; empty unless they are INVITED. */
  inviteUntil: string;
  avatarUrl: string | null;
  created: string;
  /** Raw, for sorting. */
  createdRaw: string;
};

const FILTERS = ["ALL", "INVITED", "ACTIVE", "CLOSED"] as const;
const ACCESS = ["ANY", "ACTIVE", "INVITED", "EXPIRED", "NO_ACCOUNT", "DISABLED"] as const;
const SORTS = ["NAME_AZ", "NAME_ZA", "NEWEST", "OLDEST"] as const;

/** How many fit on a screen before scrolling stops being browsing. */
const PER_PAGE = 24;

/*
 * The client directory, in two shapes.
 *
 * One dataset, one filter, two renderers — the cards and the rows read the same
 * array, so a search that works in one cannot fail in the other. Switching is state
 * in the browser: instant, and it keeps the search and the filter exactly as they
 * were, because nothing is refetched.
 *
 * Which shape you get next time is saved on your own staff row, not on the
 * workspace: two colleagues may reasonably disagree about this.
 */
export function ClientsBrowser({
  rows,
  view: initialView,
  defaultLocale,
}: {
  rows: ClientRow[];
  view: "GRID" | "LIST";
  defaultLocale: "en" | "nl" | "es";
}) {
  const { t } = useCopy();
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("NAME_AZ");
  const [access, setAccess] = useState<(typeof ACCESS)[number]>("ANY");
  const [page, setPage] = useState(0);

  const statusLabel: Record<string, string> = {
    INVITED: t.clients.statusInvited,
    ACTIVE: t.clients.statusActive,
    CLOSED: t.clients.statusClosed,
  };
  const filterLabel: Record<string, string> = { ALL: t.clients.filterAll, ...statusLabel };
  const sortLabel = t.clients.sort as Record<string, string>;
  const accessLabel: Record<string, string> = {
    ANY: t.access.filterAll,
    ACTIVE: t.access.ACTIVE,
    UNVERIFIED: t.access.UNVERIFIED,
    INVITED: t.access.INVITED,
    EXPIRED: t.access.EXPIRED,
    NO_ACCOUNT: t.access.NO_ACCOUNT,
    DISABLED: t.access.DISABLED,
  };

  function choose(next: "GRID" | "LIST") {
    setView(next);
    // The screen has already changed; this is only for the next visit.
    void setClientsViewAction(next);
  }

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matched = rows.filter((row) => {
      if (filter !== "ALL" && row.status !== filter) return false;
      if (access !== "ANY" && row.access !== access) return false;
      if (needle === "") return true;
      return [row.name, row.email, row.phone, row.companyName, row.code].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });

    const sorted = [...matched];
    if (sort === "NAME_AZ") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "NAME_ZA") sorted.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "NEWEST") sorted.sort((a, b) => b.createdRaw.localeCompare(a.createdRaw));
    if (sort === "OLDEST") sorted.sort((a, b) => a.createdRaw.localeCompare(b.createdRaw));
    return sorted;
  }, [rows, query, filter, access, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  /*
   * A dot and a word, next to the status pill rather than instead of it: the pill
   * says how far the file has come, this says whether the person on the other side
   * can actually open it. Conflating the two is what made this unreadable before.
   */
  function accessMark(row: ClientRow) {
    return (
      <span
        className={s.access}
        title={row.access === "INVITED" && row.inviteUntil
          ? `${accessLabel[row.access]} — ${row.inviteUntil}`
          : accessLabel[row.access]}
      >
        <span className={`${s.dot} ${s[`dot${row.access}`] ?? ""}`} aria-hidden="true" />
        {accessLabel[row.access]}
      </span>
    );
  }

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <div className={s.toggle} role="group" aria-label={t.clients.viewLabel}>
          <button
            type="button"
            className={view === "GRID" ? `${s.toggleButton} ${s.toggleOn}` : s.toggleButton}
            aria-pressed={view === "GRID"}
            title={t.clients.gridView}
            aria-label={t.clients.gridView}
            onClick={() => choose("GRID")}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button
            type="button"
            className={view === "LIST" ? `${s.toggleButton} ${s.toggleOn}` : s.toggleButton}
            aria-pressed={view === "LIST"}
            title={t.clients.listView}
            aria-label={t.clients.listView}
            onClick={() => choose("LIST")}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6.5h16M4 12h16M4 17.5h16" />
            </svg>
          </button>
        </div>

        <NewClientButton defaultLocale={defaultLocale} />
      </div>

      <div className={s.controls}>
        <input
          type="search"
          className={s.search}
          value={query}
          onChange={(event) => reset(setQuery)(event.target.value)}
          placeholder={t.clients.searchPlaceholder}
          aria-label={t.clients.searchPlaceholder}
        />
        <label className={s.sortField}>
          <span className={s.sortLabel}>{t.access.label}</span>
          <select
            className={s.select}
            value={access}
            aria-label={t.access.filterLabel}
            onChange={(event) =>
              reset(setAccess)(event.target.value as (typeof ACCESS)[number])
            }
          >
            {ACCESS.map((option) => (
              <option key={option} value={option}>
                {accessLabel[option]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.sortField}>
          <span className={s.sortLabel}>{t.clients.sortBy}</span>
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

      <div className={s.filters} role="group" aria-label={t.clients.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? `${s.chip} ${s.chipOn}` : s.chip}
            aria-pressed={filter === option}
            onClick={() => reset(setFilter)(option)}
          >
            {filterLabel[option]}
          </button>
        ))}
      </div>

      <p className={s.count}>
        {shown.length === rows.length
          ? fill(rows.length === 1 ? t.clients.countOne : t.clients.countMany, { n: rows.length })
          : fill(t.clients.countFiltered, { shown: shown.length, total: rows.length })}
      </p>

      {shown.length === 0 ? (
        <p className={s.empty}>{rows.length === 0 ? t.clients.empty : t.clients.noMatch}</p>
      ) : view === "GRID" ? (
        <div className={s.grid}>
          {slice.map((row) => (
            <Link key={row.id} href={`/admin/clients/${row.id}`} className={s.card}>
              <span className={s.cardTop}>
                <Avatar url={row.avatarUrl} initials={row.initials} size={48} />
                <span className={s.cardWho}>
                  <span className={s.cardName}>{row.name}</span>
                  {/* Empty lines are left out rather than printed as a dash. */}
                  {row.companyName && <span className={s.cardCompany}>{row.companyName}</span>}
                </span>
              </span>

              <span className={s.cardLines}>
                {row.email && (
                  <span className={s.cardLine}>
                    <span className={s.glyph} aria-hidden="true">
                      ✉
                    </span>
                    {row.email}
                  </span>
                )}
                {row.phone && (
                  <span className={s.cardLine}>
                    <span className={s.glyph} aria-hidden="true">
                      ☎
                    </span>
                    {row.phone}
                  </span>
                )}
                {row.place && (
                  <span className={s.cardLine}>
                    <span className={s.glyph} aria-hidden="true">
                      ⌖
                    </span>
                    {row.place}
                  </span>
                )}
              </span>

              <span className={s.cardFoot}>
                <span className={`${s.pill} ${s[`pill${row.status}`] ?? ""}`}>
                  {statusLabel[row.status]}
                </span>
                {accessMark(row)}
                <span className={s.code}>{row.code}</span>
                <span className={s.details}>{t.clients.viewDetails}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={s.listWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t.clients.columnClient}</th>
                <th>{t.common.email}</th>
                <th>{t.fields.phone}</th>
                <th>{t.clients.columnPlace}</th>
                <th>{t.clients.columnStatus}</th>
                <th>{t.access.label}</th>
                <th>{t.clients.columnCreated}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/clients/${row.id}`} className={s.rowLink}>
                      <Avatar url={row.avatarUrl} initials={row.initials} size={32} />
                      <span>
                        <span className={s.rowName}>{row.name}</span>
                        <span className={s.rowSub}>{row.companyName || row.code}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={s.muted}>{row.email}</td>
                  <td className={s.muted}>{row.phone || "—"}</td>
                  <td className={s.muted}>{row.place || "—"}</td>
                  <td>
                    <span className={`${s.pill} ${s[`pill${row.status}`] ?? ""}`}>
                      {statusLabel[row.status]}
                    </span>
                  </td>
                  <td>
                    {accessMark(row)}
                    {row.access === "INVITED" && row.inviteUntil && (
                      <span className={s.rowSub}>{row.inviteUntil}</span>
                    )}
                  </td>
                  <td className={s.muted}>{row.created}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* The same rows on a phone, where a six-column table cannot go. */}
          <div className={s.compact}>
            {slice.map((row) => (
              <Link key={row.id} href={`/admin/clients/${row.id}`} className={s.compactRow}>
                <Avatar url={row.avatarUrl} initials={row.initials} size={36} />
                <span className={s.compactWho}>
                  <span className={s.rowName}>{row.name}</span>
                  <span className={s.rowSub}>{row.email}</span>
                </span>
                <span className={s.compactPills}>
                  <span className={`${s.pill} ${s[`pill${row.status}`] ?? ""}`}>
                    {statusLabel[row.status]}
                  </span>
                  {accessMark(row)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className={s.pager}>
          <button
            type="button"
            className={s.pageButton}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            {t.clients.previous}
          </button>
          <span className={s.pageOf}>
            {fill(t.clients.pageOf, { page: current + 1, pages })}
          </span>
          <button
            type="button"
            className={s.pageButton}
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            {t.clients.next}
          </button>
        </div>
      )}
    </div>
  );
}
