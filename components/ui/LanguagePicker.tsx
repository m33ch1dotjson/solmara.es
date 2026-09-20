"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setLocaleAction } from "@/app/locale-actions";
import type { Locale } from "@/lib/brand";
import { LOCALE_NAME, LOCALES } from "@/lib/i18n";
import { FLAG } from "./Flags";
import { useCopy } from "./LocaleProvider";
import s from "./LanguagePicker.module.css";

/*
 * The header's language control: the flag you are reading in, and a small menu
 * behind it.
 *
 * It calls the same server action the three-button switcher uses, so there is one
 * place that decides what a language change means and one cookie behind it. The
 * plain switcher stays on the sign-in and invite screens, where somebody may be
 * waiting for JavaScript that has not arrived; here, in a signed-in tool, a popover
 * is the better shape.
 */
export function LanguagePicker({ locale }: { locale: Locale }) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Current = FLAG[locale];

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    start(async () => {
      const form = new FormData();
      form.set("locale", next);
      await setLocaleAction(form);
    });
  }

  return (
    <div className={s.wrap} ref={box}>
      <button
        type="button"
        className={s.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.common.changeLanguage}
        title={LOCALE_NAME[locale]}
        disabled={pending}
        onClick={() => setOpen((was) => !was)}
      >
        <Current />
        <span className={s.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={s.menu} role="menu">
          {LOCALES.map((option) => {
            const Flag = FLAG[option];
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={option === locale}
                lang={option}
                className={option === locale ? `${s.item} ${s.itemOn}` : s.item}
                onClick={() => choose(option)}
              >
                <Flag />
                {LOCALE_NAME[option]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
