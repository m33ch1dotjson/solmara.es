"use client";

import { useRef, useState, useTransition } from "react";
import { saveInvoicingAction } from "@/app/admin/workspace/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import type { Locale } from "@/lib/brand";
import { LOCALE_NAME, LOCALES } from "@/lib/i18n";
import s from "@/app/admin/account/account.module.css";

/*
 * What an invoice says about Solmavera.
 *
 * Every field here is copied onto an invoice at the moment it is finalised, and
 * never read again after that. Changing the IBAN tomorrow changes tomorrow's
 * invoices; the ones already sent keep saying what they said.
 *
 * The bank fields start empty and stay empty until somebody types the real ones.
 * An invented IBAN on an invoice is money going to the wrong place.
 */
export function InvoicingForm(props: {
  legalName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
  paymentInstructions: string;
  invoicePrefix: string;
  paymentTermsDays: string;
  invoiceLanguage: Locale;
  invoiceNotes: string;
  logoUrl: string | null;
}) {
  const { t } = useCopy();
  const [values, setValues] = useState(props);
  const [logo, setLogo] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setResult(null);
  }

  function save(removeLogo = false) {
    setResult(null);
    start(async () => {
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (key === "logoUrl") continue;
        form.set(key, String(value ?? ""));
      }
      if (logo) form.set("invoiceLogo", logo);
      if (removeLogo) form.set("removeInvoiceLogo", "1");

      const outcome = await saveInvoicingAction(form);
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
        <h2 className={s.cardTitle}>{t.workspace.invoiceCompany}</h2>
        <p className={s.cardLead}>{t.workspace.invoiceCompanyLead}</p>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.legalName}</span>
            <input
              className={s.input}
              value={values.legalName}
              onChange={(event) => set("legalName", event.target.value)}
            />
            <span className={s.hint}>{t.workspace.legalNameHint}</span>
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.taxId}</span>
            <input
              className={s.input}
              value={values.taxId}
              onChange={(event) => set("taxId", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.invoices.address}</span>
            <input
              className={s.input}
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.invoices.postalCode}</span>
            <input
              className={s.input}
              value={values.postalCode}
              onChange={(event) => set("postalCode", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.invoices.city}</span>
            <input
              className={s.input}
              value={values.city}
              onChange={(event) => set("city", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.invoices.province}</span>
            <input
              className={s.input}
              value={values.province}
              onChange={(event) => set("province", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.invoices.country}</span>
            <input
              className={s.input}
              value={values.country}
              onChange={(event) => set("country", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.invoiceDefaults}</h2>
        <p className={s.cardLead}>{t.workspace.invoiceDefaultsLead}</p>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.invoicePrefix}</span>
            <input
              className={s.input}
              value={values.invoicePrefix}
              onChange={(event) => set("invoicePrefix", event.target.value.toUpperCase())}
              maxLength={8}
            />
            <span className={s.hint}>{t.workspace.invoicePrefixHint}</span>
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.paymentTerms}</span>
            <input
              className={s.input}
              inputMode="numeric"
              value={values.paymentTermsDays}
              onChange={(event) => set("paymentTermsDays", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.invoiceLanguage}</span>
            <select
              className={s.select}
              value={values.invoiceLanguage}
              onChange={(event) => set("invoiceLanguage", event.target.value as Locale)}
            >
              {LOCALES.map((option) => (
                <option key={option} value={option}>
                  {LOCALE_NAME[option]}
                </option>
              ))}
            </select>
          </label>
          <label className={`${s.field} ${s.wide}`}>
            <span className={s.label}>{t.workspace.invoiceNotes}</span>
            <input
              className={s.input}
              value={values.invoiceNotes}
              onChange={(event) => set("invoiceNotes", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.payment}</h2>
        <p className={s.cardLead}>{t.workspace.paymentLead}</p>

        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.accountHolder}</span>
            <input
              className={s.input}
              value={values.accountHolder}
              onChange={(event) => set("accountHolder", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t.workspace.bankName}</span>
            <input
              className={s.input}
              value={values.bankName}
              onChange={(event) => set("bankName", event.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>IBAN</span>
            <input
              className={s.input}
              value={values.iban}
              onChange={(event) => set("iban", event.target.value.toUpperCase())}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>BIC / SWIFT</span>
            <input
              className={s.input}
              value={values.bic}
              onChange={(event) => set("bic", event.target.value.toUpperCase())}
            />
          </label>
          <label className={`${s.field} ${s.wide}`}>
            <span className={s.label}>{t.invoices.paymentInstructions}</span>
            <input
              className={s.input}
              value={values.paymentInstructions}
              onChange={(event) => set("paymentInstructions", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.workspace.invoiceLogo}</h2>
        <p className={s.cardLead}>{t.workspace.invoiceLogoLead}</p>

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
              accept="image/png,image/jpeg"
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

        <div className={s.actions}>
          <button type="button" className={s.primary} disabled={pending} onClick={() => save()}>
            {pending ? t.common.busy : t.account.saveChanges}
          </button>
          {result && <span className={result.ok ? s.ok : s.error}>{result.message}</span>}
        </div>
      </section>
    </>
  );
}
