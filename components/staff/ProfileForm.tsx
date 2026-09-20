"use client";

import { useRef, useState, useTransition } from "react";
import { saveProfileAction } from "@/app/admin/account/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "@/app/admin/account/account.module.css";

/**
 * Name, address, role and a picture.
 *
 * The email address is shown but not editable: it is the identity the whole portal
 * resolves on — staff_user, Supabase auth and every policy hang off it — so changing
 * it is an admin's job with a confirmation mail behind it, not a text field.
 */
export function ProfileForm({
  name,
  email,
  roleLabel,
  initials,
  avatarUrl,
}: {
  name: string;
  email: string;
  roleLabel: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const { t } = useCopy();
  const [draftName, setDraftName] = useState(name);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);

  function save(removeAvatar = false) {
    setResult(null);
    start(async () => {
      const form = new FormData();
      form.set("name", draftName);
      if (picked) form.set("avatar", picked);
      if (removeAvatar) form.set("removeAvatar", "1");
      const outcome = await saveProfileAction(form);
      setPicked(null);
      setResult(
        outcome.ok
          ? { ok: true, message: outcome.message ?? "" }
          : { ok: false, message: outcome.error },
      );
    });
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t.account.tabProfile}</h2>
      <p className={s.cardLead}>{t.account.profileLead}</p>

      <div className={s.avatarRow}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className={s.avatar} />
        ) : (
          <span className={s.avatarFallback} aria-hidden="true">
            {initials}
          </span>
        )}

        <div className={s.avatarActions}>
          <input
            ref={picker}
            type="file"
            accept="image/*"
            className={s.hiddenInput}
            onChange={(event) => setPicked(event.target.files?.[0] ?? null)}
          />
          <button type="button" className={s.ghost} onClick={() => picker.current?.click()}>
            {picked ? picked.name : t.account.chooseAvatar}
          </button>
          {avatarUrl && (
            <button
              type="button"
              className={s.ghost}
              onClick={() => save(true)}
              disabled={pending}
            >
              {t.account.removeAvatar}
            </button>
          )}
        </div>
      </div>

      <div className={s.fields}>
        <label className={s.field}>
          <span className={s.label}>{t.account.fullName}</span>
          <input
            className={s.input}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            autoComplete="name"
          />
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.common.email}</span>
          <input className={`${s.input} ${s.readonly}`} value={email} readOnly />
          <span className={s.hint}>{t.account.emailFixed}</span>
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.account.role}</span>
          <input className={`${s.input} ${s.readonly}`} value={roleLabel} readOnly />
          <span className={s.hint}>{t.account.roleFixed}</span>
        </label>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.primary} disabled={pending} onClick={() => save()}>
          {pending ? t.common.busy : t.account.saveChanges}
        </button>
        {result && (
          <span className={result.ok ? s.ok : s.error}>{result.message}</span>
        )}
      </div>
    </section>
  );
}
