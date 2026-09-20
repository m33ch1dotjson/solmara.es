"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Mono, StatusPill } from "@/components/ui";
import type { Locale } from "@/lib/brand";
import type { CaseRecord } from "@/lib/domain";
import { STAFF_TERMS } from "@/lib/staff-terms";
import { staffStatusLabel } from "@/lib/status";
import s from "./CaseTable.module.css";

/*
 * The case list.
 *
 * Filters are client-side and combine with AND. They live in the URL as well as in
 * state so that opening a case and coming back keeps the view — losing a filter set
 * after every click is the fastest way to make a table like this annoying.
 */

const COLUMNS = [
  STAFF_TERMS.caseColumn,
  "Client",
  "Service",
  "Stage",
  "Owner",
  "Next action",
  "Due",
  "Docs",
] as const;

interface FilterSpec {
  key: FilterKey;
  label: string;
  options: string[];
}

type FilterKey = "service" | "stage" | "assignee" | "due";

const ANY: Record<FilterKey, string> = {
  service: "All services",
  stage: "All stages",
  assignee: "Anyone",
  due: "Any date",
};

export function CaseTable({ records, locale }: { records: CaseRecord[]; locale: Locale }) {
  const [filters, setFilters] = useState<Record<FilterKey, string>>({ ...ANY });
  const [query, setQuery] = useState("");

  const specs: FilterSpec[] = useMemo(() => {
    const unique = (pick: (c: CaseRecord) => string) =>
      Array.from(new Set(records.map(pick))).sort();
    return [
      { key: "service", label: "Service", options: [ANY.service, ...unique((c) => c.serviceName)] },
      { key: "stage", label: "Stage", options: [ANY.stage, ...unique((c) => c.stageLabel)] },
      { key: "assignee", label: "Assignee", options: [ANY.assignee, ...unique((c) => c.assignee)] },
      { key: "due", label: "Due", options: [ANY.due, "Overdue", "Today", "This week"] },
    ];
  }, [records]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((c) => {
      if (filters.service !== ANY.service && c.serviceName !== filters.service) return false;
      if (filters.stage !== ANY.stage && c.stageLabel !== filters.stage) return false;
      if (filters.assignee !== ANY.assignee && c.assignee !== filters.assignee) return false;
      if (filters.due === "Overdue" && c.due.status !== "overdue") return false;
      if (filters.due === "Today" && c.due.status !== "dueToday") return false;
      if (filters.due === "This week" && c.due.status === "noDate") return false;
      if (needle && !`${c.code} ${c.clientName} ${c.serviceName}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [records, filters, query]);

  const dirty = Object.keys(ANY).some((key) => filters[key as FilterKey] !== ANY[key as FilterKey]);

  return (
    <>
      <div className={s.filterBar}>
        {specs.map((spec) => (
          <label key={spec.key} className={s.filter}>
            <span className={s.filterLabel}>{spec.label}</span>
            <select
              className={s.select}
              value={filters[spec.key]}
              onChange={(e) => setFilters((prev) => ({ ...prev, [spec.key]: e.target.value }))}
            >
              {spec.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}

        {(dirty || query) && (
          <button
            type="button"
            className={s.reset}
            onClick={() => {
              setFilters({ ...ANY });
              setQuery("");
            }}
          >
            Reset
          </button>
        )}

        <div className={s.search}>
          <span className={s.searchGlyph} aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            className={s.searchInput}
            placeholder="Search case, client or service"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cases"
          />
        </div>
      </div>

      <div className={s.countLabel}>
        {visible.length} of {records.length} shown
      </div>

      {/* One scroll container wraps both the header and the body so the columns stay
          aligned while scrolling horizontally. */}
      <div className={s.scroll}>
        <div className={s.table}>
          <div className={s.headRow} role="row">
            {COLUMNS.map((column) => (
              <span key={column} role="columnheader">
                {column}
              </span>
            ))}
          </div>

          {visible.map((record) => {
            const progress = ((record.stageIndex + 1) / record.stageCount) * 100;
            const label =
              record.due.status === "overdue" ||
              record.due.status === "dueLater" ||
              record.due.status === "dueSoon" ||
              record.due.status === "noDate"
                ? record.due.label
                : staffStatusLabel(record.due.status, locale);

            return (
              <Link key={record.code} href={`/admin/cases/${record.code}`} className={s.row}>
                <Mono size={12.5} color="var(--ink-3)">
                  {record.code}
                </Mono>
                <span className={s.truncate} style={{ fontWeight: 550, fontSize: 14 }}>
                  {record.clientName}
                </span>
                <span className={s.truncate} style={{ color: "var(--ink-2)", fontSize: 13 }}>
                  {record.serviceName}
                </span>
                <span className={s.stageCell}>
                  <span className={s.truncate}>{record.stageLabel}</span>
                  <span
                    className={s.stageSliver}
                    style={{
                      background: `linear-gradient(to right, var(--accent) ${progress}%, var(--line) ${progress}%)`,
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className={s.owner}>
                  <span className={s.ownerAvatar} aria-hidden="true">
                    {record.assigneeInitials}
                  </span>
                  <span className={s.truncate}>{record.assignee}</span>
                </span>
                <span className={s.truncate} style={{ fontSize: 13.5 }}>
                  {record.nextAction}
                </span>
                <span>
                  <StatusPill
                    status={record.due.status}
                    audience="staff"
                    locale={locale}
                    labelOverride={label}
                  />
                </span>
                <Mono size={12.5} color="var(--ink-2)">
                  {record.documentsApproved}/{record.documentsTotal}
                </Mono>
              </Link>
            );
          })}

          {visible.length === 0 && (
            <div className={s.empty}>
              No cases match these filters. <button onClick={() => setFilters({ ...ANY })}>Reset</button>
            </div>
          )}
        </div>
      </div>

      <p className={s.footer}>Sorted by due date. Cases with no date sit at the bottom.</p>
    </>
  );
}
