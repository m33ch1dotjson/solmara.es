"use client";

import Link from "next/link";
import { useLocale } from "@/components/client/LocaleProvider";
import { Button, Card, Mono } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import shell from "../portal.module.css";
import s from "./done.module.css";

/*
 * A finished case.
 *
 * The "what happens next" block exists to prevent a future phone call: the NIE never
 * needs renewing, and a lost certificate can be replaced at any police station. Two
 * facts, placed where someone will actually read them.
 *
 * The offer at the bottom is justified by effort saved, not by sales language.
 */
export default function DonePage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];

  return (
    <>
      <Link href="/" className={shell.back}>
        ‹ {terms.backToServices}
      </Link>

      <div className={s.tile} aria-hidden="true">
        ✓
      </div>

      <div>
        <h1 className={shell.h1}>{copy.done.title}</h1>
        <p className={s.body}>{copy.done.body}</p>
      </div>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.done.keepTitle}</h2>
        <p className={shell.sectionSub}>{copy.done.keepSub}</p>

        <div className={s.downloads}>
          {copy.finalDocs.map((document) => (
            <button key={document.name} type="button" className={s.download}>
              <span className={s.pdfTag}>
                <Mono size={11} weight={600}>
                  PDF
                </Mono>
              </span>
              <span className={s.downloadText}>
                <span className={s.downloadName}>{document.name}</span>
                <span className={s.downloadMeta}>{document.meta}</span>
              </span>
              <span className={s.arrow} aria-hidden="true">
                ↓
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.done.nextTitle}</h2>
        <ul className={s.facts}>
          {copy.done.next.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>

      <Card audience="client" className={s.again}>
        <div className={s.againTitle}>{copy.done.againTitle}</div>
        <p className={s.againBody}>{copy.done.againBody}</p>
        <Button variant="secondary" size="clientCompact">
          {copy.done.againCta}
        </Button>
      </Card>
    </>
  );
}
