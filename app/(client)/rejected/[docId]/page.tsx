"use client";

import Link from "next/link";
import { useLocale } from "@/components/client/LocaleProvider";
import { AssetPlaceholder, Button, Card, Eyebrow } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { featuredCaseCode } from "@/lib/mock";
import shell from "../../portal.module.css";
import s from "./rejected.module.css";

/*
 * A document that cannot be used.
 *
 * The sequence is deliberate: what is wrong → why it matters → exactly what to do →
 * how normal this is. Never "your document was rejected by us".
 *
 * Note the agent in the copy: the Spanish authorities will not accept the photo, not
 * the office. And there is no red banner, no warning triangle at the top and no
 * exclamation mark anywhere — the heading states the need, not the failure.
 */
export default function RejectedPage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];

  return (
    <>
      <Link href={`/services/${featuredCaseCode}`} className={shell.back}>
        ‹ {terms.backToServices}
      </Link>

      <div>
        <h1 className={shell.h1}>{copy.rejected.title}</h1>
        <p className={s.body}>{copy.rejected.body}</p>
      </div>

      <Card audience="client" className={s.card}>
        <Eyebrow audience="client">{copy.rejected.whatSent}</Eyebrow>
        <AssetPlaceholder minHeight={150} caption={copy.rejected.thumb} />

        <div className={s.reason}>
          <div className={s.reasonTag}>{copy.rejected.reasonTag}</div>
          <p className={s.reasonText}>{copy.rejected.reason}</p>
        </div>
      </Card>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>{copy.rejected.stepsTitle}</h2>
        <ol className={s.steps}>
          {copy.rejectSteps.map((step, i) => (
            <li key={step} className={s.step}>
              <span className={s.number} aria-hidden="true">
                {i + 1}
              </span>
              <span className={s.stepText}>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Link href={`/upload/doc-2`} className={s.plainLink}>
        <Button variant="primary" size="clientTall">
          {copy.rejected.cta}
        </Button>
      </Link>

      {/* Normalisation closes the screen: this is common and fixable. */}
      <p className={shell.note}>{copy.rejected.reassure}</p>
    </>
  );
}
