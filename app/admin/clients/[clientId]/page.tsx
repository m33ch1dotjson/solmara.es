import Link from "next/link";
import { TaskList } from "@/components/staff/TaskList";
import { Button, Dot, Eyebrow, Mono, StatusPill, StepSegments } from "@/components/ui";
import { brand } from "@/lib/brand";
import type { ClientRecord } from "@/lib/domain";
import { formatFullDate, formatMoney } from "@/lib/format";
import {
  DOCUMENT_STATUS_KEY,
  activity,
  clientCaseCards,
  documents,
  featuredClient,
  payments,
  tasks,
} from "@/lib/mock";
import shell from "../../staff.module.css";
import s from "./client.module.css";

/*
 * The client card: one person, everything about them, behind six tabs.
 *
 * The tab lives in the URL so a colleague can be sent straight to the documents of
 * a specific client, and so a refresh does not dump you back on Overview.
 *
 * The Overview tab is the answer to "what was his NIE again?". Identifiers are
 * structured fields on the client, so nobody has to open a PDF to read a number.
 */

const TABS = ["overview", "services", "documents", "tasks", "activity", "payments"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  services: "Services",
  documents: "Documents",
  tasks: "Tasks",
  activity: "Activity",
  payments: "Payments",
};

function isTab(value: string | undefined): value is Tab {
  return value !== undefined && (TABS as readonly string[]).includes(value);
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await params;
  const { tab: requested } = await searchParams;
  const tab: Tab = isTab(requested) ? requested : "overview";

  const locale = brand.defaultLocale;
  const client = featuredClient;

  return (
    <div className={shell.screen}>
      <header className={s.person}>
        <div className={s.avatar} aria-hidden="true">
          {initials(client.name)}
        </div>
        <div className={s.personText}>
          <h1 className={s.name}>{client.name}</h1>
          <div className={s.identity}>
            <Mono size={12.5} color="var(--ink-3)">
              {client.code}
            </Mono>
            <span className={s.sep}>·</span>
            <StatusPill
              status="approved"
              audience="staff"
              locale={locale}
              labelOverride={client.status === "ACTIVE" ? "Active" : "Dormant"}
            />
            <span className={s.sep}>·</span>
            <span>{languageName(client.locale)}</span>
            <span className={s.sep}>·</span>
            <span>Client since {client.since}</span>
            <span className={s.sep}>·</span>
            <span>Assigned to {client.assignedTo}</span>
          </div>
        </div>
        <div className={s.personActions}>
          <Button size="staffTall" variant="secondary">
            Message
          </Button>
          <Button size="staffTall" variant="primary">
            New case
          </Button>
        </div>
      </header>

      <nav className={s.tabs}>
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/admin/clients/${client.id}?tab=${key}`}
            className={key === tab ? `${s.tab} ${s.tabOn}` : s.tab}
            aria-current={key === tab ? "page" : undefined}
          >
            {TAB_LABELS[key]}
            {key === "services" && <Mono size={11}>{clientCaseCards.length}</Mono>}
            {key === "documents" && <Mono size={11}>{documents.length}</Mono>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview client={client} />}

      {tab === "services" && (
        <div className={s.cases}>
          {clientCaseCards.map((card) => (
            <Link key={card.id} href={`/admin/cases/${card.id}`} className={s.caseCard}>
              <div className={s.caseTop}>
                <Mono size={12.5} color="var(--ink-3)">
                  {card.id}
                </Mono>
                <StatusPill
                  status={card.due === "Due today" ? "dueToday" : "dueLater"}
                  audience="staff"
                  locale={locale}
                  labelOverride={card.due}
                />
              </div>
              <div className={s.caseService}>{card.service}</div>
              <div className={s.caseBar}>
                <StepSegments total={5} filled={card.si + 1} />
              </div>
              <div className={s.caseStage}>{card.stage}</div>
              <div className={s.caseFooter}>
                {card.docs} · {card.assignee}
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "documents" && (
        <>
          <p className={s.tabLead}>
            Documents belong to {client.name.split(" ")[0]}, not to a case. A passport approved once
            is reused everywhere it is needed, so nobody asks for it twice.
          </p>
          <div className={s.shared}>
            {documents.map((document) => (
              <div key={document.id} className={s.sharedRow}>
                <div className={s.sharedText}>
                  <div className={s.sharedName}>{document.name}</div>
                  <div className={s.sharedMeta}>{document.meta}</div>
                  {document.caseCodes.length > 1 && (
                    <div className={s.usedBy}>
                      {document.caseCodes.map((code) => (
                        <span key={code} className={s.usedChip}>
                          <span className={s.usedTick} aria-hidden="true">
                            ✓
                          </span>
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={s.sharedRight}>
                  <span className={s.sharedUsed}>
                    {document.caseCodes.length === 1
                      ? "1 case"
                      : `${document.caseCodes.length} cases`}
                  </span>
                  <StatusPill
                    status={DOCUMENT_STATUS_KEY[document.status]}
                    audience="staff"
                    locale={locale}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "tasks" && (
        <div className={s.panel}>
          <TaskList tasks={tasks} />
        </div>
      )}

      {tab === "activity" && (
        <ol className={s.activity}>
          {activity.map((entry) => (
            <li key={entry.id} className={s.activityItem}>
              <span className={s.activityDot}>
                <Dot tone={entry.tone} />
              </span>
              <div>
                <div className={s.activityText}>{entry.text}</div>
                <Mono size={11.5} color="var(--ink-3)">
                  {entry.when}
                </Mono>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === "payments" && (
        <div className={s.panel}>
          {payments.map((payment) => (
            <div key={payment.id} className={s.paymentRow}>
              <div>
                <div className={s.sharedName}>{payment.label[locale]}</div>
                <div className={s.sharedMeta}>{payment.meta[locale]}</div>
              </div>
              <div className={s.sharedRight}>
                <Mono size={13.5} weight={500}>
                  {formatMoney(payment.amount, locale)}
                </Mono>
                <StatusPill
                  status={payment.status}
                  audience="staff"
                  locale={locale}
                  labelOverride={payment.staffStatus}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- overview */

function Overview({ client }: { client: ClientRecord }) {
  const locale = brand.defaultLocale;

  return (
    <div className={s.overview}>
      <Group title="Personal">
        <Fact k="Full legal name" v={client.name} />
        <Fact
          k="Date of birth"
          v={client.identity.dateOfBirth ? formatFullDate(client.identity.dateOfBirth, locale) : null}
        />
        <Fact k="Nationality" v={client.identity.nationality} />
        <Fact k="Marital status" v={client.identity.maritalStatus} />
      </Group>

      {/* Numbers live here as data. The matching PDFs live in the Documents tab. */}
      <Group title="Identification">
        <Fact k="Passport number" v={client.identity.passportNumber} mono />
        <Fact
          k="Passport expiry"
          v={
            client.identity.passportExpiry
              ? formatFullDate(client.identity.passportExpiry, locale)
              : null
          }
        />
        <Fact k="NIE number" v={client.identity.nieNumber} mono pending="Issued when the NIE case completes" />
        <Fact k="Social security (NUSS)" v={client.identity.nussNumber} mono />
        <Fact k="Health card (SIP)" v={client.identity.sipNumber} mono />
      </Group>

      <Group title="Contact">
        <Fact k="Email" v={client.email} />
        <Fact k="Phone" v={client.phone} />
        <Fact k="WhatsApp" v={client.whatsapp} />
        <Fact k="Preferred language" v={languageName(client.locale)} />
      </Group>

      <Group title="Address">
        <Fact k="Home country" v={client.addresses.homeCountry} />
        <Fact k="Spain" v={client.addresses.spain} />
      </Group>

      <Group title="Internal">
        <Fact k="Assigned to" v={client.assignedTo} />
        <Fact k="Lead source" v={client.leadSource} />
        <Fact k="Notes" v={client.internalNotes} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.group}>
      <Eyebrow audience="staff">{title}</Eyebrow>
      <dl className={s.groupFacts}>{children}</dl>
    </section>
  );
}

/** An empty field reads as "not known yet", never as a blank or an "n/a". */
function Fact({
  k,
  v,
  mono,
  pending,
}: {
  k: string;
  v: string | null | undefined;
  mono?: boolean;
  pending?: string;
}) {
  return (
    <div className={s.factRow}>
      <dt className={s.factKey}>{k}</dt>
      <dd className={s.factValue}>
        {v ? (
          mono ? (
            <Mono size={13}>{v}</Mono>
          ) : (
            v
          )
        ) : (
          <span className={s.factEmpty}>{pending ?? "Not known yet"}</span>
        )}
      </dd>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function languageName(locale: string): string {
  const names: Record<string, string> = { en: "English", nl: "Dutch", es: "Spanish" };
  return names[locale] ?? locale;
}
