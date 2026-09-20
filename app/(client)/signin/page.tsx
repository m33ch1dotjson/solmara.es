"use client";

import { useState } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import { browserClient } from "@/lib/auth/supabase-browser";
import shell from "../portal.module.css";
import s from "./signin.module.css";

/*
 * One sign-in for both audiences.
 *
 * Which portal you land in is decided afterwards, by whether the address sits in
 * staff_user or client_contact — never by a choice made on this screen. That keeps
 * "am I staff?" answerable only by the database.
 *
 * A password is the main route while outbound mail is still being set up. The link
 * stays available as a second option, and once mail works it can become the default
 * again by swapping which half of this screen is shown first.
 *
 * Neither route reveals whether an address is known to us. Same wording, same
 * behaviour, known or not: otherwise this form is a way to enumerate the client list.
 */
export default function SignInPage() {
  const { t } = useCopy();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

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
      setError(t.signin.wrong);
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

  if (linkSent) {
    return (
      <div className={s.block}>
        <div className={s.tile} aria-hidden="true">
          ✉
        </div>
        <h1 className={shell.h1}>{t.signin.checkMail}</h1>
        <p className={shell.body}>{t.signin.checkMailLead}</p>
        <button type="button" className={s.textLink} onClick={() => setLinkSent(false)}>
          {t.signin.backToSignIn}
        </button>
      </div>
    );
  }

  return (
    <form className={s.block} onSubmit={signIn}>
      <h1 className={shell.h1}>{t.signin.title}</h1>
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

      <div className={s.divider}>
        <span>{t.common.or}</span>
      </div>

      <button type="button" className={s.secondary} onClick={sendLink} disabled={pending || !email}>
        {t.signin.sendLink}
      </button>
      <p className={shell.note}>{t.signin.linkHint}</p>
    </form>
  );
}
