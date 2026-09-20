"use client";

import { LanguageSwitcher, useLocale } from "@/components/client/LocaleProvider";
import { Mono, StatusPill } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { DOCUMENT_STATUS_KEY, clientVault } from "@/lib/mock";
import shell from "../portal.module.css";
import s from "./documents.module.css";

/*
 * The client's own document vault.
 *
 * This screen is not in the design handoff; Solmara asked for it, and the reason is
 * concrete: someone standing at a bank counter needs their NIE certificate on their
 * phone, right then. Everything we have checked and accepted stays available to them.
 *
 * Only settled documents appear. A file still in review is not theirs to rely on yet,
 * and showing it here would invite them to hand over something we may still reject.
 */
export default function MyDocumentsPage() {
  const { locale } = useLocale();
  const terms = CLIENT_TERMS[locale];
  const vault = clientVault();

  return (
    <>
      <div>
        <h1 className={shell.h1}>{terms.documents}</h1>
        <p className={s.lead}>{terms.documentsLead}</p>
      </div>

      {vault.length === 0 ? (
        <p className={shell.note}>{terms.documentsEmpty}</p>
      ) : (
        <div className={s.list}>
          {vault.map((document) => (
            <button key={document.id} type="button" className={s.row}>
              <span className={s.tag}>
                <Mono size={11} weight={600}>
                  PDF
                </Mono>
              </span>

              <span className={s.text}>
                <span className={s.name}>{document.name}</span>
                <span className={s.meta}>{document.meta}</span>

                {/* Which services this one file serves — the reason it was only ever
                    asked for once. */}
                <span className={s.usedFor}>
                  {terms.usedFor}: {document.caseCodes.length}{" "}
                  {document.caseCodes.length === 1 ? "service" : "services"}
                </span>

                <span className={s.pill}>
                  <StatusPill
                    status={DOCUMENT_STATUS_KEY[document.status]}
                    audience="client"
                    locale={locale}
                  />
                </span>
              </span>

              <span className={s.arrow} aria-hidden="true">
                ↓
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={shell.footer}>
        <LanguageSwitcher />
      </div>
    </>
  );
}
