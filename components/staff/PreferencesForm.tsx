"use client";

import { useState, useTransition } from "react";
import { savePreferencesAction } from "@/app/admin/account/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import type { Locale } from "@/lib/brand";
import { DATE_STYLES, LOCALE_NAME, LOCALES, formatDateFor, type DateStyle } from "@/lib/i18n";
import s from "@/app/admin/account/account.module.css";

/*
 * Language, appearance, time zone, date format.
 *
 * These are the same settings as the two quick controls at the bottom of the rail,
 * and they stay in step: saving writes the language cookie the switcher reads and
 * the localStorage key the theme script reads, so the rail updates with the page.
 */

/** The zones this office actually works across. A full IANA list is 400 rows of noise. */
const ZONES = [
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/London",
  "Atlantic/Canary",
  "UTC",
  "America/New_York",
  "America/Bogota",
  "Asia/Dubai",
];

const THEMES = ["light", "dark", "system"] as const;

export function PreferencesForm({
  locale,
  theme,
  timeZone,
  dateStyle,
}: {
  locale: Locale;
  theme: string;
  timeZone: string;
  dateStyle: string;
}) {
  const { t } = useCopy();
  const [draftLocale, setDraftLocale] = useState<Locale>(locale);
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftZone, setDraftZone] = useState(timeZone);
  const [draftStyle, setDraftStyle] = useState<DateStyle>(dateStyle as DateStyle);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  const themeLabel: Record<string, string> = {
    light: t.common.themeLight,
    dark: t.common.themeDark,
    system: t.account.themeSystem,
  };

  function save() {
    setSaved(null);
    start(async () => {
      const form = new FormData();
      form.set("locale", draftLocale);
      form.set("theme", draftTheme);
      form.set("timeZone", draftZone);
      form.set("dateStyle", draftStyle);
      const result = await savePreferencesAction(form);

      if (result.ok) {
        // The theme is read before first paint by the inline script in the root
        // layout, which can only see localStorage — so the browser's copy is
        // written here rather than on the server.
        try {
          localStorage.setItem("solmara-theme", draftTheme);
        } catch {
          // Storage blocked: the preference is saved on the account either way.
        }
        const resolved =
          draftTheme === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : draftTheme;
        document.documentElement.setAttribute("data-theme", resolved);
      }

      setSaved(result.ok ? (result.message ?? "") : result.error);
    });
  }

  const sample = new Date();

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t.account.tabPreferences}</h2>
      <p className={s.cardLead}>{t.account.preferencesLead}</p>

      <div className={s.fields}>
        <label className={s.field}>
          <span className={s.label}>{t.common.language}</span>
          <select
            className={s.select}
            value={draftLocale}
            onChange={(event) => setDraftLocale(event.target.value as Locale)}
          >
            {LOCALES.map((option) => (
              <option key={option} value={option}>
                {LOCALE_NAME[option]}
              </option>
            ))}
          </select>
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.account.appearance}</span>
          <select
            className={s.select}
            value={draftTheme}
            onChange={(event) => setDraftTheme(event.target.value)}
          >
            {THEMES.map((option) => (
              <option key={option} value={option}>
                {themeLabel[option]}
              </option>
            ))}
          </select>
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.account.timeZone}</span>
          <select
            className={s.select}
            value={draftZone}
            onChange={(event) => setDraftZone(event.target.value)}
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.account.dateFormat}</span>
          <select
            className={s.select}
            value={draftStyle}
            onChange={(event) => setDraftStyle(event.target.value as DateStyle)}
          >
            {DATE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style === "LONG" ? t.account.dateLong : style}
              </option>
            ))}
          </select>
          {/* Today, written the chosen way: the fastest way to know what you picked. */}
          <span className={s.hint}>
            {formatDateFor(sample, draftLocale, { style: draftStyle, timeZone: draftZone })}
          </span>
        </label>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={save} disabled={pending}>
          {pending ? t.common.busy : t.account.savePreferences}
        </button>
        {saved && <span className={s.ok}>{saved}</span>}
      </div>
    </section>
  );
}
