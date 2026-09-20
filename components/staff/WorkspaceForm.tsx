"use client";

import { useRef, useState, useTransition } from "react";
import { saveWorkspaceAction } from "@/app/admin/workspace/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import type { Locale } from "@/lib/brand";
import { LOCALE_NAME, LOCALES } from "@/lib/i18n";
import s from "@/app/admin/account/account.module.css";

/*
 * Three cards, one save button.
 *
 * Deliberately not a theme editor: colours stay in lib/brand.ts and app/tokens.css,
 * where one accent hue generates every accent surface. A colour picker here would be
 * a second place that decides what the portal looks like.
 */

const COUNTRIES = ["ES", "NL", "BE", "DE", "FR", "GB", "US"];
const CURRENCIES = ["EUR", "GBP", "USD"];

export function WorkspaceForm(props: {
  companyName: string;
  companyEmail: string;
  phone: string;
  website: string;
  displayName: string;
  defaultClientLocale: Locale;
  defaultCountry: string;
  defaultCurrency: string;
  logoUrl: string | null;
}) {
  const { t } = useCopy();
  const [values, setValues] = useState(props);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<File | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setResult(null);
  }

  function save(removeLogo = false) {
    setResult(null);
    start(async () => {
      const form = new FormData();
      form.set("companyName", values.companyName);
      form.set("companyEmail", values.companyEmail);
      form.set("phone", values.phone);
      form.set("website", values.website);
      form.set("displayName", values.displayName);
      form.set("defaultClientLocale", values.defaultClientLocale);
      form.set("defaultCountry", values.defaultCountry);
      form.set("defaultCurrency", values.defaultCurrency);
      if (logo) form.set("logo", logo);
      if (removeLogo) form.set("removeLogo", "1");

      const outcome = await saveWorkspaceAction(form);
      setLogo(null);
      setResult(
        outcome.ok
          ? { ok: true, message: outcome.message ?? "" }
          : { ok: false, message: outcome.error },
      );
    });
  }

  return (
    <>
      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.company}</h2>
        <p className={s.cardLead}>{t.workspace.companyLead}</p>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.companyName}</span>
            <input
              className={s.input}
              value={values.companyName}
              onChange={(event) => set("companyName", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.companyEmail}</span>
            <input
              className={s.input}
              type="email"
              value={values.companyEmail}
              onChange={(event) => set("companyEmail", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.phone}</span>
            <input
              className={s.input}
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.website}</span>
            <input
              className={s.input}
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
              placeholder="https://"
            />
          </label>
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.defaults}</h2>
        <p className={s.cardLead}>{t.workspace.defaultsLead}</p>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.defaultLanguage}</span>
            <select
              className={s.select}
              value={values.defaultClientLocale}
              onChange={(event) => set("defaultClientLocale", event.target.value as Locale)}
            >
              {LOCALES.map((option) => (
                <option key={option} value={option}>
                  {LOCALE_NAME[option]}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.defaultCountry}</span>
            <select
              className={s.select}
              value={values.defaultCountry}
              onChange={(event) => set("defaultCountry", event.target.value)}
            >
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.defaultCurrency}</span>
            <select
              className={s.select}
              value={values.defaultCurrency}
              onChange={(event) => set("defaultCurrency", event.target.value)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.branding}</h2>
        <p className={s.cardLead}>{t.workspace.brandingLead}</p>

        <div className={s.avatarRow}>
          {props.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.logoUrl} alt="" className={s.avatar} />
          ) : (
            <span className={s.avatarFallback} aria-hidden="true">
              ◧
            </span>
          )}
          <div className={s.avatarActions}>
            <input
              ref={picker}
              type="file"
              accept="image/*"
              className={s.hiddenInput}
              onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
            />
            <button type="button" className={s.ghost} onClick={() => picker.current?.click()}>
              {logo ? logo.name : t.workspace.chooseLogo}
            </button>
            {props.logoUrl && (
              <button
                type="button"
                className={s.ghost}
                disabled={pending}
                onClick={() => save(true)}
              >
                {t.workspace.removeLogo}
              </button>
            )}
          </div>
        </div>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.displayName}</span>
            <input
              className={s.input}
              value={values.displayName}
              onChange={(event) => set("displayName", event.target.value)}
            />
            <span className={s.hint}>{t.workspace.displayNameHint}</span>
          </label>
        </div>

        <div className={s.actions}>
          <button type="button" className={s.primary} onClick={() => save()} disabled={pending}>
            {pending ? t.common.busy : t.account.saveChanges}
          </button>
          {result && <span className={result.ok ? s.ok : s.error}>{result.message}</span>}
        </div>
      </section>
    </>
  );
}
