"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "@/lib/brand";
import { type ClientCopy, clientCopy } from "@/lib/mock";
import s from "./LocaleProvider.module.css";

/*
 * Language for the client portal.
 *
 * In production the initial value comes from the client's stored preference, which
 * is why the provider takes it as a prop rather than guessing from the browser. The
 * switcher stays available because people share a case with a partner who may read
 * another language, and because a wrong guess is otherwise unrecoverable.
 *
 * Switching also sets `lang` on the document, so a screen reader changes voice with
 * the copy.
 */

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  copy: ClientCopy;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LANGS: Array<{ key: Locale; label: string }> = [
  { key: "en", label: "EN" },
  { key: "nl", label: "NL" },
  { key: "es", label: "ES" },
];

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initial);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value: LocaleContextValue = {
    locale,
    setLocale,
    copy: clientCopy[locale],
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside a LocaleProvider");
  return value;
}

/** An in-page control, not a preview harness. Sits quietly at the foot of a page. */
export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className={s.switcher} role="group" aria-label="Language">
      {LANGS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={locale === option.key ? `${s.lang} ${s.langOn}` : s.lang}
          aria-pressed={locale === option.key}
          onClick={() => setLocale(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
