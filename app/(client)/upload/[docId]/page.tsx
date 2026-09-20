"use client";

import Link from "next/link";
import { useLocale } from "@/components/client/LocaleProvider";
import { AssetPlaceholder, Card } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { featuredCaseCode } from "@/lib/mock";
import shell from "../../portal.module.css";
import s from "./upload.module.css";

/*
 * Upload a document. The camera is the primary path, because almost nobody has a
 * scanner and most people photograph their passport with a phone.
 *
 * The framing diagram comes before any button: showing what a good photo looks like
 * prevents the retake, and a retake is the thing that costs both sides a day.
 */
export default function UploadPage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];

  return (
    <>
      <Link href={`/services/${featuredCaseCode}`} className={shell.back}>
        ‹ {terms.backToServices}
      </Link>

      <div>
        <h1 className={shell.h1}>{copy.upload.title}</h1>
        <p className={s.body}>{copy.upload.body}</p>
      </div>

      <Card audience="client" className={s.card}>
        <div className={s.frame}>
          <AssetPlaceholder minHeight={190} caption={copy.upload.diagram} className={s.striped} />
          <span className={s.guide} aria-hidden="true" />
        </div>

        <div className={s.tips}>
          <div className={s.tipsTitle}>{copy.upload.tipsTitle}</div>
          <ul className={s.tipList}>
            {copy.upload.tips.map((tip) => (
              <li key={tip}>
                <span className={s.tick} aria-hidden="true">
                  ✓
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className={s.actions}>
        {/* `capture` puts the camera first on a phone and is ignored on desktop. */}
        <label className={s.cameraLabel}>
          <input type="file" accept="image/*" capture="environment" className={s.hiddenInput} />
          <span className={s.cameraButton}>{copy.upload.camera}</span>
        </label>

        <label className={s.fileLabel}>
          <input type="file" accept="image/*,application/pdf" className={s.hiddenInput} />
          <span className={s.fileButton}>{copy.upload.file}</span>
        </label>
      </div>

      <p className={shell.note}>{copy.upload.note}</p>
    </>
  );
}
