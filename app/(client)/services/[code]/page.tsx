"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LanguageSwitcher, useLocale } from "@/components/client/LocaleProvider";
import { Button, Card, Eyebrow, Mono, StatusPill } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { dayOfMonth, monthAbbrev } from "@/lib/format";
import { appointment } from "@/lib/mock";
import shell from "../../portal.module.css";
import s from "./case.module.css";

/*
 * The client's case screen. The order is deliberate: the ask comes before the story.
 *
 * 1. What is needed from you (omitted entirely when nothing is)
 * 2. Where things stand
 * 3. Your documents
 * 4. Appointment, payments, final documents
 *
 * Nothing operational appears: no staff names, no internal stage names, no queue
 * position, and no indication that the case is late.
 */

const DOC_STATUS = {
  missing: "required",
  rejected: "rejected",
  received: "received",
  ok: "approved",
} as const;

export default function ClientCaseDetailPage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];
  const params = useParams<{ code: string }>();
  const code = params.code;

  const outstanding = copy.docs.filter(
    (d) => d.status === "missing" || d.status === "rejected",
  ).length;

  return (
    <>
      <Link href="/" className={shell.back}>
        ‹ {terms.backToServices}
      </Link>

      <div>
        <Eyebrow audience="client">
          {terms.serviceKicker} <Mono size={13}>{code}</Mono>
        </Eyebrow>
        <h1 className={shell.h1}>{copy.detail.service}</h1>
      </div>

      {outstanding > 0 && (
        <div className={s.actionCard}>
          <Eyebrow audience="client">{copy.detail.needTag}</Eyebrow>
          <div className={s.actionTitle}>{copy.detail.needTitle}</div>
          <p className={s.actionBody}>{copy.detail.needBody}</p>
          <Link href={`/upload/doc-1`} className={s.plainLink}>
            <Button variant="primary" size="client">
              {copy.detail.needCta}
            </Button>
          </Link>
        </div>
      )}

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.detail.progressTitle}</h2>
        <ol className={s.stepper}>
          {copy.steps.map((step, i) => {
            const state = i < 2 ? "done" : i === 2 ? "current" : "future";
            return (
              <li key={step.label} className={s.step}>
                <span
                  className={
                    state === "done"
                      ? `${s.mark} ${s.markDone}`
                      : state === "current"
                        ? `${s.mark} ${s.markNow}`
                        : s.mark
                  }
                  aria-hidden="true"
                >
                  {state === "done" ? "✓" : state === "current" ? "●" : ""}
                </span>
                <div className={s.stepText}>
                  <div className={state === "future" ? `${s.stepLabel} ${s.future}` : s.stepLabel}>
                    {step.label}
                  </div>
                  <div className={s.stepMeta}>{step.meta}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.detail.docsTitle}</h2>
        <p className={shell.sectionSub}>{copy.detail.docsSub}</p>

        <div className={s.docs}>
          {copy.docs.map((document, i) => {
            const needsAction = document.status === "missing" || document.status === "rejected";
            const tone = document.status === "rejected" ? "danger" : "warn";
            // The href stays inline: typedRoutes infers Link's route from the literal
            // at the call site, and a pre-typed variable defeats that inference.
            const docId = String(i + 1);

            return (
              <Card
                key={document.label}
                audience="client"
                tone={needsAction ? tone : undefined}
                className={s.doc}
              >
                <div className={s.docLabel}>{document.label}</div>
                <p className={s.docMeta}>{document.meta}</p>

                {needsAction ? (
                  <Link
                    href={
                      document.status === "rejected"
                        ? `/rejected/doc-${docId}`
                        : `/upload/doc-${docId}`
                    }
                    className={s.plainLink}
                  >
                    <Button variant="primary" size="clientCompact">
                      {copy.docCta[document.status]}
                    </Button>
                  </Link>
                ) : (
                  <StatusPill
                    status={DOC_STATUS[document.status]}
                    audience="client"
                    locale={locale}
                  />
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.detail.apptTitle}</h2>
        <Card audience="client" className={s.appt}>
          <div className={s.apptTop}>
            <div className={s.apptDate}>
              <Mono size={22} weight={600}>
                {dayOfMonth(appointment.date)}
              </Mono>
              <Mono size={12} color="var(--ink-3)">
                {monthAbbrev(appointment.date, locale)}
              </Mono>
            </div>
            <div>
              <div className={s.apptTime}>{copy.appt.time}</div>
              <div className={s.apptPlace}>{copy.appt.place}</div>
              <div className={s.apptPlace}>{copy.appt.address}</div>
            </div>
          </div>

          <div className={s.bring}>
            <Eyebrow audience="client">{copy.detail.bring}</Eyebrow>
            <ul className={s.bringList}>
              {copy.appt.bring.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={s.apptButtons}>
            <Button variant="secondary" size="clientCompact">
              {copy.detail.addCal}
            </Button>
            <Button variant="secondary" size="clientCompact">
              {copy.detail.map}
            </Button>
          </div>
        </Card>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.detail.payTitle}</h2>
        <div className={s.payments}>
          {copy.payments.map((payment) => (
            <div key={payment.label} className={s.payment}>
              <div>
                <div className={s.payLabel}>{payment.label}</div>
                <div className={s.payMeta}>{payment.meta}</div>
              </div>
              <div className={s.payRight}>
                <Mono size={15} weight={500}>
                  {payment.amount}
                </Mono>
                <StatusPill
                  status={payment.tone === "ok" ? "paid" : "received"}
                  audience="client"
                  locale={locale}
                  labelOverride={payment.status}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.detail.finalTitle}</h2>
        {/* An empty state that reads as a promise rather than a blank. */}
        <Card audience="client" className={s.promise}>
          <p className={shell.body}>{copy.detail.finalBody}</p>
        </Card>
      </section>

      <div className={shell.footer}>
        <LanguageSwitcher />
      </div>
    </>
  );
}
