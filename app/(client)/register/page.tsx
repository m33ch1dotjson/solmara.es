"use client";

import { useState } from "react";
import Link from "next/link";
import { completeRegistrationAction } from "./actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Logo } from "@/components/ui/Logo";
import { browserClient } from "@/lib/auth/supabase-browser";
import { brand } from "@/lib/brand";
import { fill } from "@/lib/i18n";
import shell from "../portal.module.css";
import s from "../signin/signin.module.css";

/*
 * Signing up without being invited.
 *
 * The thing this screen must not do is create a second file for somebody we already
 * know. It does not try to work that out here — the address is not verified yet and
 * "do we know you?" answered in the browser is a way to ask us which of your
 * neighbours is a client. The matching happens server-side in app.client_register(),
 * after Supabase has proved the person controls the mailbox, and an address we
 * already have attaches the new login to the existing file.
 *
 * If the Supabase project requires a confirmation mail there is no session yet; then
 * the linking happens in /auth/callback when they open the link. Both paths end in
 * the same function.
 */
const MINIMUM = 8;

export default function RegisterPage() {
  const { t } = useCopy();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkMail, setCheckMail] = useState(false);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!agreed) {
      setError(t.register.termsRequired);
      return;
    }
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
    const address = email.trim().toLowerCase();

    const { data, error: failure } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        // Kept on the auth user so the callback can still name the file when the
        // confirmation mail is opened days later, in another browser.
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (failure) {
      setPending(false);
      setError(
        failure.message.toLowerCase().includes("already registered")
          ? t.register.exists
          : t.register.failed,
      );
      return;
    }

    if (!data.session) {
      // Confirmation required: the account exists but cannot be used yet.
      setPending(false);
      setCheckMail(true);
      return;
    }

    const result = await completeRegistrationAction(name);
    setPending(false);

    if (!result.ok) {
      setError(t.register.staffAddress);
      return;
    }

    window.location.href = "/";
  }

  if (checkMail) {
    return (
      <div className={s.block}>
        <div className={s.brand}>
          <Logo size={38} className={s.brandLogo} />
          <span className={s.brandName}>
            {fill(t.signin.portalTitle, { brand: brand.clientName })}
          </span>
        </div>
        <div className={s.tile} aria-hidden="true">
          ✉
        </div>
        <h1 className={shell.h1}>{t.register.checkMailTitle}</h1>
        <p className={shell.body}>{t.register.checkMailLead}</p>
        <Link href="/signin" className={s.textLink}>
          {t.signin.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <form className={s.block} onSubmit={submit}>
      <div className={s.brand}>
        <Logo size={38} className={s.brandLogo} />
        <span className={s.brandName}>
          {fill(t.signin.portalTitle, { brand: brand.clientName })}
        </span>
      </div>

      <h1 className={shell.h1}>{t.register.title}</h1>
      <p className={shell.body}>{t.register.lead}</p>

      <label className={s.field}>
        <span className={s.label}>{t.register.nameLabel}</span>
        <input
          className={s.input}
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <span className={s.hint}>{t.register.nameHint}</span>
      </label>

      <label className={s.field}>
        <span className={s.label}>{t.common.email}</span>
        <input
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          className={s.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

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

      <label className={s.checkbox}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          {t.register.terms} <Link href="/terms">{t.footer.terms}</Link> ·{" "}
          <Link href="/privacy">{t.footer.privacy}</Link>
        </span>
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? t.common.busy : t.register.submit}
      </button>

      {error && <p className={s.error}>{error}</p>}

      <p className={s.newHere}>{t.register.haveAccount}</p>
      <Link href="/signin" className={s.secondaryLink}>
        {t.common.signIn}
      </Link>
    </form>
  );
}
