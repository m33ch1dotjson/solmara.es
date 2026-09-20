"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher, useLocale } from "@/components/client/LocaleProvider";
import { Button, Card } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { brand } from "@/lib/brand";
import shell from "../portal.module.css";
import s from "./signin.module.css";

/*
 * Sign in — three states: the form, "check your email", and code entry.
 *
 * The security rule shapes the copy: the response must never reveal whether an
 * address is known to us. Both paths produce identical wording and identical timing
 * for known and unknown addresses, and the copy does not branch.
 */

type State = "form" | "sent" | "code";

export default function SignInPage() {
  const { copy, locale } = useLocale();
  const terms = CLIENT_TERMS[locale];
  const [state, setState] = useState<State>("form");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array.from({ length: 6 }, () => ""));

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)));
  }

  return (
    <>
      <div className={shell.brandRow}>
        <div className={shell.logo} aria-hidden="true" />
        <div className={shell.wordmark}>{brand.clientName}</div>
      </div>

      {state === "form" && (
        <form
          className={s.block}
          onSubmit={(e) => {
            e.preventDefault();
            setState("sent");
          }}
        >
          <h1 className={shell.h1}>{copy.signin.title}</h1>
          <p className={shell.body}>{copy.signin.body}</p>

          <label className={s.field}>
            <span className={s.label}>{copy.signin.label}</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <Button type="submit" variant="primary" size="client">
            {copy.signin.cta}
          </Button>

          <p className={shell.note}>{copy.signin.privacy}</p>
        </form>
      )}

      {state === "sent" && (
        <div className={s.block}>
          <div className={s.tile} aria-hidden="true">
            ✉
          </div>
          <h1 className={shell.h1}>{copy.sent.title}</h1>
          <p className={shell.body}>{copy.sent.body}</p>

          <Card audience="client" className={s.helpCard}>
            <div className={s.helpTitle}>{copy.sent.noEmailTitle}</div>
            <p className={s.helpBody}>{copy.sent.noEmailBody}</p>
            <Button variant="secondary" size="clientCompact" onClick={() => setState("code")}>
              {copy.sent.codeCta}
            </Button>
          </Card>

          <button type="button" className={s.textLink} onClick={() => setState("form")}>
            {copy.sent.change}
          </button>
        </div>
      )}

      {state === "code" && (
        <form
          className={s.block}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <h1 className={shell.h1}>{copy.code.title}</h1>
          <p className={shell.body}>{copy.code.body}</p>

          <div className={s.codeRow}>
            {digits.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                className={s.codeBox}
                value={digit}
                onChange={(e) => setDigit(i, e.target.value)}
                aria-label={`Digit ${i + 1} of 6`}
              />
            ))}
          </div>

          <Button type="submit" variant="primary" size="client">
            {copy.code.cta}
          </Button>

          <p className={shell.note}>{copy.code.resend}</p>

          <button type="button" className={s.textLink} onClick={() => setState("form")}>
            {copy.code.back}
          </button>
        </form>
      )}

      <div className={shell.footer}>
        <LanguageSwitcher />
        {/* Present so the demo is navigable; a real session lands here after the link. */}
        <Link href="/" className={s.textLink}>
          {terms.backToServices}
        </Link>
      </div>
    </>
  );
}
