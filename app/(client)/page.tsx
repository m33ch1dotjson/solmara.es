"use client";

import Link from "next/link";
import { LanguageSwitcher, useLocale } from "@/components/client/LocaleProvider";
import { Card, StatusPill, StepSegments } from "@/components/ui";
import { brand } from "@/lib/brand";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { featuredCaseCode } from "@/lib/mock";
import shell from "./portal.module.css";
import s from "./home.module.css";

/*
 * My services — the client's home screen.
 *
 * One card per service. Status is a full sentence, never a code. The chip says either
 * what is needed or, explicitly, that nothing is — an absent chip would leave the
 * reader guessing, which is the same as making them phone.
 *
 * The word is "service", not "case": a client did not open a file with us, they asked
 * us to arrange something. Internally the entity is still a case.
 */
export default function MyServicesPage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];

  return (
    <>
      <div>
        <h1 className={shell.h1}>{copy.cases.hi}</h1>
        <p className={s.summary}>{copy.cases.summary}</p>
      </div>

      <div className={s.sectionLabel}>{terms.services}</div>

      <div className={s.cards}>
        {copy.caseCards.map((card, i) => {
          const needsSomething = card.tone === "warn";
          return (
            <Link
              key={card.service}
              href={`/services/${i === 0 ? featuredCaseCode : `ES-249${i}`}`}
              className={s.cardLink}
            >
              <Card audience="client" className={s.card}>
                <div className={s.service}>{card.service}</div>
                <p className={s.status}>{card.status}</p>
                <StepSegments total={5} filled={card.si + 1} />
                <div className={s.stepRow}>
                  <span className={s.step}>{card.step}</span>
                </div>
                {/* The wording is the client's own copy from the design, so the count
                    survives; the tone and glyph come from the status vocabulary. */}
                <StatusPill
                  status={needsSomething ? "dueToday" : "required"}
                  audience="client"
                  locale={locale}
                  labelOverride={card.todo}
                />
              </Card>
            </Link>
          );
        })}
      </div>

      <div className={shell.footer}>
        <p className={shell.note}>{copy.cases.help}</p>
        <p className={shell.note}>
          {brand.supportPhone} · {brand.supportHours[locale]}
        </p>
        <LanguageSwitcher />
      </div>
    </>
  );
}
