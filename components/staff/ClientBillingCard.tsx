"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClientBillingAction } from "@/app/admin/clients/client-actions";
import { Avatar } from "@/components/ui/Avatar";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "@/app/admin/account/account.module.css";

/*
 * What the office knows about a client, as opposed to what the client filled in
 * themselves.
 *
 * These are the fields an invoice needs — company, address, NIE or NIF, VAT number
 * — and they are staff-editable here so that nobody has to retype them on every
 * invoice. The client's own screen never shows this card.
 *
 * Read first, edit on purpose: the same shape as the Process Guide and a property.
 */
export function ClientBillingCard({
  id,
  initials,
  avatarUrl,
  values,
}: {
  id: string;
  initials: string;
  avatarUrl: string | null;
  values: {
    companyName: string;
    phone: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
    taxId: string;
    vatNumber: string;
  };
}) {
  const { t } = useCopy();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values);
  const [picked, setPicked] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function save(removeAvatar = false) {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      for (const [key, value] of Object.entries(draft)) form.set(key, value);
      if (picked) form.set("avatar", picked);
      if (removeAvatar) form.set("removeAvatar", "1");

      const result = await saveClientBillingAction(form);
      setPicked(null);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
    });
  }

  const filled: Array<[string, string]> = [
    [t.invoices.companyName, values.companyName],
    [t.fields.phone, values.phone],
    [t.invoices.postalCode, values.postalCode],
    [t.invoices.city, values.city],
    [t.invoices.province, values.province],
    [t.invoices.country, values.country],
    [t.invoices.taxId, values.taxId],
    [t.invoices.vatNumber, values.vatNumber],
  ];

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t.clients.billingTitle}</h2>
      <p className={s.cardLead}>{t.clients.billingLead}</p>

      <div className={s.avatarRow}>
        <Avatar url={avatarUrl} initials={initials} size={64} />
        <div className={s.avatarActions}>
          <input
            ref={picker}
            type="file"
            accept="image/*"
            className={s.hiddenInput}
            onChange={(event) => setPicked(event.target.files?.[0] ?? null)}
          />
          <button type="button" className={s.ghost} onClick={() => picker.current?.click()}>
            {picked ? picked.name : t.clients.choosePhoto}
          </button>
          {picked && (
            <button type="button" className={s.primary} disabled={pending} onClick={() => save()}>
              {pending ? t.common.busy : t.clients.savePhoto}
            </button>
          )}
          {avatarUrl && !picked && (
            <button type="button" className={s.ghost} disabled={pending} onClick={() => save(true)}>
              {t.clients.removePhoto}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <div className={s.fields}>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.companyName}</span>
              <input
                className={s.input}
                value={draft.companyName}
                onChange={(event) => set("companyName", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.fields.phone}</span>
              <input
                className={s.input}
                value={draft.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.postalCode}</span>
              <input
                className={s.input}
                value={draft.postalCode}
                onChange={(event) => set("postalCode", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.city}</span>
              <input
                className={s.input}
                value={draft.city}
                onChange={(event) => set("city", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.province}</span>
              <input
                className={s.input}
                value={draft.province}
                onChange={(event) => set("province", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.country}</span>
              <input
                className={s.input}
                value={draft.country}
                onChange={(event) => set("country", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.taxId}</span>
              <input
                className={s.input}
                value={draft.taxId}
                onChange={(event) => set("taxId", event.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.invoices.vatNumber}</span>
              <input
                className={s.input}
                value={draft.vatNumber}
                onChange={(event) => set("vatNumber", event.target.value)}
              />
            </label>
          </div>

          <div className={s.actions}>
            <button type="button" className={s.primary} disabled={pending} onClick={() => save()}>
              {pending ? t.common.busy : t.account.saveChanges}
            </button>
            <button
              type="button"
              className={s.ghost}
              onClick={() => {
                setDraft(values);
                setEditing(false);
                setMessage(null);
              }}
            >
              {t.common.cancel}
            </button>
            {message && <span className={message.ok ? s.ok : s.error}>{message.text}</span>}
          </div>
        </>
      ) : (
        <>
          {filled.every(([, value]) => value === "") ? (
            <p className={s.note}>{t.clients.billingEmpty}</p>
          ) : (
            <div className={s.rowGroup}>
              {filled
                .filter(([, value]) => value !== "")
                .map(([label, value]) => (
                  <div className={s.switchRow} key={label}>
                    <span className={s.label}>{label}</span>
                    <span className={s.switchSpacer} />
                    <span className={s.switchText}>{value}</span>
                  </div>
                ))}
            </div>
          )}

          <div className={s.actions}>
            <button type="button" className={s.ghost} onClick={() => setEditing(true)}>
              {t.guides.edit}
            </button>
            {message && <span className={message.ok ? s.ok : s.error}>{message.text}</span>}
          </div>
        </>
      )}
    </section>
  );
}
