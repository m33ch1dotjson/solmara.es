import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentChecklist } from "@/components/staff/DocumentChecklist";
import { RequestDocuments } from "@/components/staff/RequestDocuments";
import { TaskList } from "@/components/staff/TaskList";
import { Button, Dot, Eyebrow, Mono, StatusPill } from "@/components/ui";
import { brand, portalUrl } from "@/lib/brand";
import { formatMoney, monthAbbrev, dayOfMonth } from "@/lib/format";
import {
  activity,
  appointment,
  caseByCode,
  checklistFor,
  documentTones,
  nieTemplate,
  payments,
  tasks,
} from "@/lib/mock";
import { staffStatusLabel } from "@/lib/status";
import shell from "../../staff.module.css";
import s from "./case.module.css";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const record = caseByCode(code);
  if (!record) notFound();

  const locale = brand.defaultLocale;
  // The checklist is the client's documents that this case relies on, not a set of
  // files owned by the case.
  const checklist = checklistFor(record.code);
  const stageMeta = ["done 29 Aug", "done 5 Sep", "cita 24 Sep", "—", "—"];
  const dueLabel =
    record.due.status === "overdue" ||
    record.due.status === "dueLater" ||
    record.due.status === "dueSoon" ||
    record.due.status === "noDate"
      ? record.due.label
      : staffStatusLabel(record.due.status, locale);

  return (
    <>
      <header className={s.band}>
        <div className={s.bandInner}>
          <div className={s.bandTop}>
            <Mono size={12.5} color="var(--ink-3)">
              {record.code} · opened 28 Aug 2026
            </Mono>
          </div>

          <div className={s.bandMain}>
            <div className={s.heading}>
              <h1 className={s.h1}>{record.serviceName}</h1>
              <Link href={`/admin/clients/${record.clientId}`} className={s.clientLink}>
                {record.clientName}
              </Link>
            </div>

            <div className={s.actions}>
              <StatusPill
                status={record.due.status}
                audience="staff"
                locale={locale}
                large
                labelOverride={dueLabel}
              />
              <RequestDocuments
                documents={checklist}
                caseCode={record.code}
                buildUrl={(token) => portalUrl(`/u/${token}`)}
              />
              <Button size="staffTall" variant="primary">
                Advance stage
              </Button>
            </div>
          </div>

          <ol className={s.rail}>
            {nieTemplate.stages.map((stage, i) => {
              const done = i < record.stageIndex;
              const current = i === record.stageIndex;
              return (
                <li
                  key={stage.key}
                  className={done || current ? `${s.step} ${s.stepOn}` : s.step}
                >
                  <div className={s.stepHead}>
                    <span
                      className={
                        done ? `${s.mark} ${s.markDone}` : current ? `${s.mark} ${s.markNow}` : s.mark
                      }
                      aria-hidden="true"
                    >
                      {done ? "✓" : current ? "●" : ""}
                    </span>
                    <span
                      className={current ? `${s.stepLabel} ${s.stepNow}` : done ? s.stepLabel : `${s.stepLabel} ${s.stepFuture}`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <div className={s.stepMeta}>{stageMeta[i]}</div>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <div className={`${shell.screen} ${s.grid}`}>
        <div className={s.column}>
          <DocumentChecklist documents={checklist} tones={documentTones} locale={locale} />

          <section className={s.panel}>
            <h2 className={s.panelTitle}>Tasks</h2>
            <TaskList tasks={tasks} />
          </section>
        </div>

        <div className={s.column}>
          <section className={s.panel}>
            <h2 className={s.panelTitle}>Payments</h2>
            {payments.map((payment) => (
              <div key={payment.id} className={s.moneyRow}>
                <div>
                  <div className={s.moneyLabel}>{payment.label[locale]}</div>
                  <div className={s.moneyMeta}>{payment.meta[locale]}</div>
                </div>
                <div className={s.moneyRight}>
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
          </section>

          <section className={s.panel}>
            <h2 className={s.panelTitle}>Appointment</h2>
            <div className={s.appt}>
              <div className={s.apptDate}>
                <Mono size={20} weight={600}>
                  {dayOfMonth(appointment.date)}
                </Mono>
                <Mono size={11} color="var(--ink-3)">
                  {monthAbbrev(appointment.date, locale)}
                </Mono>
              </div>
              <div>
                <div className={s.apptTime}>{appointment.time[locale]}</div>
                <div className={s.apptPlace}>{appointment.place[locale]}</div>
                <div className={s.apptPlace}>{appointment.address}</div>
              </div>
            </div>
            <div className={s.bring}>
              <Eyebrow audience="staff">What the client must bring</Eyebrow>
              <ul className={s.bringList}>
                {appointment.bring[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className={s.panel}>
            <h2 className={s.panelTitle}>Activity</h2>
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
          </section>
        </div>
      </div>
    </>
  );
}
