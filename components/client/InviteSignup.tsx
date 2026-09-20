"use client";

import { useState } from "react";
import { redeemInviteAction } from "@/app/invite/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { browserClient } from "@/lib/auth/supabase-browser";
import { fill } from "@/lib/i18n";
import s from "./client-forms.module.css";

/*
 * Turning an invite into an account.
 *
 * The client chooses a password here rather than waiting for a link, because
 * outbound mail is not configured yet — and because someone who was sent this link
 * over WhatsApp should not need their inbox at all.
 *
 * The address is fixed, not typed. The invite was issued for one person, and letting
 * a visitor change it would turn a valid link into a way to attach a stranger's
 * account to this file.
 *
 * The invite is redeemed only after Supabase has created the session, never on the
 * click that starts it.
 */
const MINIMUM = 8;

export function InviteSignup({ email }: { email: string }) {
  const { t } = useCopy();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (password.length < MINIMUM) {
      setError(fill(t.invite.tooShort, { n: MINIMUM }));
      return;
    }
    if (password !== repeat) {
      setError(t.invite.mismatch);
      return;
    }

    setPending(true);
    const supabase = browserClient();

    let { data, error: failure } = await supabase.auth.signUp({ email, password });

    // A reissued invite can land on an address that already has an account. Then
    // this is a sign-in rather than a sign-up.
    if (failure?.message.toLowerCase().includes("already registered")) {
      const attempt = await supabase.auth.signInWithPassword({ email, password });
      data = attempt.data;
      failure = attempt.error;

      if (failure) {
        setPending(false);
        setError(t.invite.existsWrongPassword);
        return;
      }
    }

    if (failure) {
      setPending(false);
      setError(t.invite.createFailed);
      return;
    }

    // No session means the project still requires a confirmation email, which
    // cannot arrive yet. Say so plainly rather than leaving a spinner.
    if (!data.session) {
      setPending(false);
      setError(t.invite.confirmationPending);
      return;
    }

    await redeemInviteAction();
    window.location.href = "/";
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <label className={s.field}>
        <span className={s.label}>{t.invite.emailLabel}</span>
        <input className={s.input} value={email} readOnly aria-readonly="true" />
        <span className={s.hint}>{t.invite.emailHint}</span>
      </label>

      <label className={s.field}>
        <span className={s.label}>{t.invite.choosePassword}</span>
        <input
          type="password"
          className={s.input}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <span className={s.hint}>{fill(t.invite.minimum, { n: MINIMUM })}</span>
      </label>

      <label className={s.field}>
        <span className={s.label}>{t.common.passwordAgain}</span>
        <input
          type="password"
          className={s.input}
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
        />
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? t.common.busy : t.invite.submit}
      </button>

      {error && <p className={s.error}>{error}</p>}
    </form>
  );
}
