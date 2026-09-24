"use client";

import { useState } from "react";
import Link from "next/link";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Logo } from "@/components/ui/Logo";
import { browserClient } from "@/lib/auth/supabase-browser";
import { brand } from "@/lib/brand";
import { fill } from "@/lib/i18n";
import shell from "../portal.module.css";
import s from "./signin.module.css";

/*
 * One sign-in for both audiences.
 *
 * Which portal you land in is decided afterwards, by whether the address sits in
 * staff_user or client_contact — never by a choice made on this screen. That keeps
 * "am I staff?" answerable only by the database.
 *
 * Email and password is the main route and is what the layout leads with. The
 * sign-in link stays underneath for the people who never remember a password, and
 * "forgotten" sits next to the field where the problem occurs.
 *
 * Neither route reveals whether an address is known to us. Same wording, same
 * behaviour, known or not: otherwise this form is a way to enumerate the client list.
 */
export default function SignInPage() {
  const { t } = useCopy();
  const brandName = brand.clientName;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function signIn(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: failure } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (failure) {
      setPending(false);
      // A banned user gets a different message from a wrong password: telling
      // somebody their password is wrong when the account was switched off sends
      // them round the reset loop forever.
      setError(
        failure.message.toLowerCase().includes("banned")
          ? t.signin.disabledAccount
          : t.signin.wrong,
      );
      return;
    }

    // A full navigation: the session cookie has just been set and the server needs
    // to see it before it can decide which portal to render.
    window.location.href = "/";
  }

  async function sendLink() {
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: failure } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });

    setPending(false);

    if (failure) {
      // 429 is the mailer's hourly cap, not a transient hiccup. Telling someone to
      // try again in a minute sends them into a loop that cannot succeed.
      setError(failure.status === 429 ? t.signin.rateLimited : t.signin.sendFailed);
      return;
    }

    setLinkSent(true);
  }

  async function sendReset(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: failure } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset` },
    );

    setPending(false);

    if (failure && failure.status === 429) {
      setError(t.signin.rateLimited);
      return;
    }

    // Anything else is swallowed on purpose: "no account for that address" is not
    // something this form should confirm to whoever is typing into it.
    setResetSent(true);
  }

  const header = (
    <div className={s.brand}>
      <Logo size={38} className={s.brandLogo} />
      <span className={s.brandName}>{fill(t.signin.portalTitle, { brand: brandName })}</span>
    </div>
  );

  if (linkSent || resetSent) {
    return (
      <div className={s.block}>
        {header}
        <div className={s.tile} aria-hidden="true">
          ✉
        </div>
        <h1 className={shell.h1}>{t.signin.checkMail}</h1>
        <p className={shell.body}>
          {linkSent ? t.signin.checkMailLead : t.reset.forgotSent}
        </p>
        <button
          type="button"
          className={s.textLink}
          onClick={() => {
            setLinkSent(false);
            setResetSent(false);
            setForgot(false);
          }}
        >
          {t.signin.backToSignIn}
        </button>
      </div>
    );
  }

  if (forgot) {
    return (
      <form className={s.block} onSubmit={sendReset}>
        {header}
        <h1 className={shell.h1}>{t.reset.forgotTitle}</h1>
        <p className={shell.body}>{t.reset.forgotLead}</p>

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

        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? t.common.busy : t.reset.sendLink}
        </button>

        {error && <p className={s.error}>{error}</p>}

        <button type="button" className={s.textLink} onClick={() => setForgot(false)}>
          {t.signin.backToSignIn}
        </button>
      </form>
    );
  }

  return (
    <form className={s.block} onSubmit={signIn}>
      {header}
      <h1 className={shell.h1}>{t.signin.signInToAccount}</h1>
      <p className={shell.body}>{t.signin.lead}</p>

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
          autoComplete="current-password"
          className={s.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? t.common.busy : t.common.signIn}
      </button>

      {error && <p className={s.error}>{error}</p>}

      <button type="button" className={s.textLink} onClick={() => setForgot(true)}>
        {t.signin.forgot}
      </button>

      <div className={s.divider}>
        <span>{t.common.or}</span>
      </div>

      <p className={s.newHere}>{fill(t.signin.newHere, { brand: brandName })}</p>
      <Link href="/register" className={s.secondaryLink}>
        {t.signin.createAccount}
      </Link>

      {/* The link route, kept but quiet: it is the fallback, not the main door. */}
      <button
        type="button"
        className={s.textLink}
        onClick={sendLink}
        disabled={pending || !email}
      >
        {t.signin.sendLink}
      </button>
    </form>
  );
}
