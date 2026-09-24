"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCopy } from "@/components/ui/LocaleProvider";
import { PortalBrand } from "@/components/ui/PortalBrand";
import { browserClient } from "@/lib/auth/supabase-browser";
import { brand } from "@/lib/brand";
import { fill } from "@/lib/i18n";
import shell from "../portal.module.css";
import s from "../signin/signin.module.css";

/*
 * Choosing a new password.
 *
 * Reached only through a recovery link, which /auth/callback has already exchanged
 * for a session — so the person is signed in by the time they get here, and changing
 * the password is an ordinary updateUser() rather than a second token to validate.
 *
 * No old password is asked for. Somebody arriving here either proved control of the
 * mailbox or was handed a temporary password by the office; requiring the old one
 * would lock out exactly the people this screen exists for.
 */
const MINIMUM = 8;

export default function ResetPasswordPage() {
  const { t } = useCopy();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // An expired or reused link leaves no session; say so instead of letting
    // somebody type a password into a form that cannot save it.
    browserClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

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
    const { error: failure } = await browserClient().auth.updateUser({ password });
    setPending(false);

    if (failure) {
      setError(t.reset.expired);
      return;
    }

    setDone(true);
  }

  const header = (
    <PortalBrand href="/signin" label={fill(t.signin.portalTitle, { brand: brand.clientName })} />
  );

  if (done) {
    return (
      <div className={s.block}>
        {header}
        <h1 className={shell.h1}>{t.reset.done}</h1>
        <Link href="/" className={s.secondaryLink}>
          {t.common.signIn}
        </Link>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className={s.block}>
        {header}
        <h1 className={shell.h1}>{t.reset.title}</h1>
        <p className={s.error}>{t.reset.expired}</p>
        <Link href="/signin" className={s.secondaryLink}>
          {t.signin.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <form className={s.block} onSubmit={submit}>
      {header}
      <Link href="/signin" className={s.back}>
        {t.common.back}
      </Link>

      <h1 className={shell.h1}>{t.reset.title}</h1>
      <p className={shell.body}>{t.reset.lead}</p>

      <label className={s.field}>
        <span className={s.label}>{t.common.password}</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          className={s.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className={s.hint}>{fill(t.invite.minimum, { n: MINIMUM })}</span>
      </label>

      <label className={s.field}>
        <span className={s.label}>{t.common.passwordAgain}</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          className={s.input}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? t.common.busy : t.reset.submit}
      </button>

      {error && <p className={s.error}>{error}</p>}
    </form>
  );
}
