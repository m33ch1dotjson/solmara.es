"use client";

import { useState } from "react";
import { AssetPlaceholder, Button, DocumentSegments, Mono } from "@/components/ui";
import type { Locale } from "@/lib/brand";
import type { UploadLinkCopy } from "@/lib/mock";
import type { Tone } from "@/lib/status";
import s from "./UploadLinkPreview.module.css";

/*
 * A preview of the public upload page, framed inside the staff tool.
 *
 * The point is that a manager can see exactly what the client will see, in the
 * client's own language, before sending the link. Switching language here changes
 * the preview only — in production the language comes from the client's profile.
 */

const LANGS: Array<{ key: Locale; label: string }> = [
  { key: "en", label: "EN" },
  { key: "nl", label: "NL" },
  { key: "es", label: "ES" },
];

const PROGRESS_TONES: Tone[] = ["ok", "ok", "ok", "ok", "mute", "mute", "mute"];

export function UploadLinkPreview({
  copy,
  url,
  expiry,
}: {
  copy: Record<Locale, UploadLinkCopy>;
  url: string;
  expiry: string;
}) {
  const [lang, setLang] = useState<Locale>("nl");
  const c = copy[lang];

  return (
    <>
      <div className={s.bar}>
        <div className={s.urlBox}>
          <Mono size={12.5} color="var(--ink-2)">
            {url}
          </Mono>
        </div>
        <span className={s.expiry}>Expires {expiry}</span>
        <div className={s.langs}>
          {LANGS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={lang === option.key ? `${s.lang} ${s.langOn}` : s.lang}
              aria-pressed={lang === option.key}
              onClick={() => setLang(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button size="staffTall" variant="primary">
          Copy link
        </Button>
      </div>

      <div className={s.frame}>
        <div className={s.page}>
          <div className={s.logo} aria-hidden="true" />
          <h2 className={s.hi}>{c.hi}</h2>
          <p className={s.intro}>{c.intro}</p>

          <div className={s.progressRow}>
            <span className={s.progressLabel}>{c.stillNeeded}</span>
            <Mono size={12.5} color="var(--ink-3)">
              {c.progress}
            </Mono>
          </div>
          <DocumentSegments tones={PROGRESS_TONES} />

          <div className={s.items}>
            {c.missing.map((item) => (
              <div key={item.name} className={s.item}>
                <div className={s.itemName}>{item.name}</div>
                <div className={s.itemHelp}>{item.help}</div>
                {item.flag && item.flagText && <div className={s.flag}>{item.flagText}</div>}
                <div className={s.uploadRow}>
                  <Button size="clientCompact" variant="primary">
                    {c.upload}
                  </Button>
                  <span className={s.photoHint}>{c.photoHint}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={s.doneBlock}>
            <div className={s.doneTitle}>{c.doneTitle}</div>
            <ul className={s.doneList}>
              {c.done.map((name) => (
                <li key={name}>
                  <span className={s.tick} aria-hidden="true">
                    ✓
                  </span>
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <AssetPlaceholder minHeight={72} caption="[ case manager photo ]" />
          <div className={s.helper}>{c.helper}</div>
          <Button size="clientCompact" variant="secondary">
            {c.ask}
          </Button>

          <p className={s.privacy}>{c.privacy}</p>
        </div>
      </div>
    </>
  );
}
