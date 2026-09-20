"use client";

import { useState, useTransition } from "react";
import { saveNotificationsAction } from "@/app/admin/account/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Switch } from "@/components/ui/Switch";
import s from "@/app/admin/account/account.module.css";

/*
 * Which events are worth an email.
 *
 * The switches are stored; nothing sends yet. The note at the top says so, because a
 * switch that looks like it works and does nothing is worse than no switch: somebody
 * will turn one on and then wonder for a week why no mail arrives.
 */

const ROWS = [
  "clientAdded",
  "documentUploaded",
  "taskAssigned",
  "taskDueSoon",
  "clientStatusChanged",
  "noteAdded",
] as const;

export function NotificationForm({ values }: { values: Record<string, boolean> }) {
  const { t } = useCopy();
  const [state, setState] = useState(values);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  const labels = t.account.notify as Record<string, string>;

  function toggle(key: string) {
    setState((current) => ({ ...current, [key]: !current[key] }));
    setSaved(null);
  }

  function save() {
    start(async () => {
      const form = new FormData();
      for (const [key, value] of Object.entries(state)) if (value) form.set(key, "on");
      const result = await saveNotificationsAction(form);
      setSaved(result.ok ? (result.message ?? "") : result.error);
    });
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t.account.tabNotifications}</h2>
      <p className={s.cardLead}>{t.account.notificationsLead}</p>
      <p className={s.note}>{t.account.notificationsNotYet}</p>

      <div className={s.rowGroup}>
        <div className={s.switchRow}>
          <span className={s.switchText}>
            {t.account.emailNotifications}
            <span className={s.switchHint}>{t.account.emailNotificationsHint}</span>
          </span>
          <span className={s.switchSpacer} />
          <Switch
            checked={state.email ?? false}
            onChange={() => toggle("email")}
            label={t.account.emailNotifications}
          />
        </div>

        {ROWS.map((key) => (
          <div className={s.switchRow} key={key}>
            <span className={s.switchText}>{labels[key]}</span>
            <span className={s.switchSpacer} />
            <Switch
              checked={(state[key] ?? false) && (state.email ?? false)}
              // The master switch is not a separate setting to keep in step: with
              // email off, the individual ones are off, and turning one on turns the
              // master back on rather than silently doing nothing.
              onChange={() => {
                setSaved(null);
                setState((current) => ({
                  ...current,
                  [key]: !(current[key] && current.email),
                  email: current.email || !current[key],
                }));
              }}
              label={labels[key] ?? key}
            />
          </div>
        ))}
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
