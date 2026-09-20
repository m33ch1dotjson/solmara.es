import Link from "next/link";
import { Dot, Mono, StatusPill } from "@/components/ui";
import { brand } from "@/lib/brand";
import type { CaseRecord } from "@/lib/domain";
import { staffTimestamp } from "@/lib/format";
import { cases } from "@/lib/mock";
import { staffStatusLabel } from "@/lib/status";
import shell from "./staff.module.css";
import s from "./work.module.css";

/*
 * My work — the landing screen.
 *
 * It answers "what do I do today" and nothing else: four counts and four grouped
 * lists, in a fixed order of urgency. No charts, no deltas, no sparklines. The
 * counters are counts, not metrics.
 */

interface Counter {
  label: string;
  value: string;
  sub: string;
  tone: "danger" | "warn" | "mute" | "info";
}

const COUNTERS: Counter[] = [
  { label: "Overdue", value: "2", sub: "both on property purchase", tone: "danger" },
  { label: "Due today", value: "3", sub: "1 needs your review", tone: "warn" },
  { label: "Waiting on client", value: "4", sub: "longest: 11 days", tone: "mute" },
  { label: "Docs to review", value: "5", sub: "across 3 cases", tone: "info" },
];

interface Group {
  title: string;
  hint: string;
  rows: CaseRecord[];
  /** Nothing is expected of the manager, so the row reads differently. */
  waiting?: boolean;
}

function groups(): Group[] {
  const byCode = (code: string) => cases.find((c) => c.code === code)!;
  return [
    {
      title: "Overdue",
      hint: "oldest first",
      rows: [byCode("ES-2470"), byCode("ES-2477")],
    },
    {
      title: "Due today",
      hint: "",
      rows: [byCode("ES-2481"), byCode("ES-2488"), byCode("ES-2479")],
    },
    {
      title: "Waiting on a client",
      hint: "reminder sent automatically after 5 days",
      rows: [byCode("ES-2492"), byCode("ES-2494"), byCode("ES-2495"), byCode("ES-2486")],
      waiting: true,
    },
    {
      title: "Deadline approaching",
      hint: "within 7 days",
      rows: [byCode("ES-2465"), byCode("ES-2452"), byCode("ES-2461")],
    },
  ];
}

export default function MyWorkPage() {
  const locale = brand.defaultLocale;
  // Fixed so the screen is deterministic until real data lands.
  const now = new Date("2026-09-18T09:12:00+02:00");

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>My work</h1>
        <div className={shell.pageStamp}>{staffTimestamp(now, locale)}</div>
      </div>
      <p className={shell.pageLead}>
        Fourteen of your cases need something today. Everything else is waiting on someone else.
      </p>

      <div className={s.counters}>
        {COUNTERS.map((counter) => (
          <div key={counter.label} className={s.counter}>
            <div className={s.counterHead}>
              <Dot tone={counter.tone} />
              <span className={s.counterLabel}>{counter.label}</span>
            </div>
            <div className={s.counterValue}>
              <Mono>{counter.value}</Mono>
            </div>
            <div className={s.counterSub}>{counter.sub}</div>
          </div>
        ))}
      </div>

      {groups().map((group) => (
        <section key={group.title} className={s.group}>
          <div className={s.groupHead}>
            <h2 className={s.groupTitle}>{group.title}</h2>
            <Mono size={12} color="var(--ink-3)">
              {group.rows.length}
            </Mono>
            <span className={s.rule} />
            <span className={s.groupHint}>{group.hint}</span>
          </div>

          <div className={s.rows}>
            {group.rows.map((record) => {
              const waiting = group.waiting === true;
              const status = waiting ? "waitingOnClient" : record.due.status;
              const label = waiting
                ? record.due.label === "—"
                  ? "no date"
                  : record.due.label
                : record.due.status === "overdue" || record.due.status === "dueLater"
                  ? record.due.label
                  : staffStatusLabel(record.due.status, locale);

              return (
                <Link key={record.code} href={`/admin/cases/${record.code}`} className={s.row}>
                  <Mono size={12.5} color="var(--ink-3)">
                    {record.code}
                  </Mono>
                  <span className={s.client}>{record.clientName}</span>
                  <span className={s.service}>{record.serviceName}</span>
                  <span className={s.action}>
                    {waiting ? `Waiting: ${record.nextAction.toLowerCase()}` : record.nextAction}
                  </span>
                  {/* The due chip is the one cell that must never truncate. */}
                  <span className={s.due}>
                    <StatusPill
                      status={status}
                      audience="staff"
                      locale={locale}
                      labelOverride={label}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
