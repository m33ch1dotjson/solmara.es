"use client";

import { useEffect, useState } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import { browserClient } from "@/lib/auth/supabase-browser";
import s from "@/app/admin/account/account.module.css";

/*
 * Two-factor authentication and other devices.
 *
 * Both run as the signed-in user through Supabase's own API, so neither needs the
 * secret key or a server action — the same reasoning as the password form next to it.
 *
 * What is *not* here, and why: a list of your active sessions with device and
 * browser. Supabase keeps sessions in its own auth schema and exposes no API to list
 * them; the only way to that table is to reach into a schema that is not ours, which
 * is exactly the thing the handoff says not to do. "Sign out everywhere else" is
 * supported and is the part that actually protects you.
 */

type Factor = { id: string; status: string; friendly_name?: string };

export function SecurityExtras() {
  const { t } = useCopy();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function refresh() {
    const supabase = browserClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setFactors([]);
      return;
    }
    setFactors((data.totp ?? []) as Factor[]);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const verified = (factors ?? []).filter((factor) => factor.status === "verified");
  const enabled = verified.length > 0;

  async function begin() {
    setProblem(null);
    setDone(null);
    setBusy(true);
    const supabase = browserClient();

    // A half-finished enrolment from a previous attempt blocks a new one, so clear
    // anything still unverified before asking for a fresh factor.
    const stale = (factors ?? []).filter((factor) => factor.status !== "verified");
    for (const factor of stale) await supabase.auth.mfa.unenroll({ factorId: factor.id });

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);

    if (error || !data) {
      setProblem(t.account.twoFactorFailed);
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!enrolling) return;
    setProblem(null);
    setBusy(true);
    const supabase = browserClient();

    const challenge = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (challenge.error || !challenge.data) {
      setBusy(false);
      setProblem(t.account.twoFactorFailed);
      return;
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setBusy(false);

    if (error) {
      setProblem(t.account.twoFactorWrongCode);
      return;
    }

    setEnrolling(null);
    setCode("");
    setDone(t.account.twoFactorOn);
    await refresh();
  }

  async function turnOff() {
    setBusy(true);
    const supabase = browserClient();
    for (const factor of factors ?? []) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    setDone(t.account.twoFactorOff);
    await refresh();
  }

  async function signOutOthers() {
    setBusy(true);
    setProblem(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) setProblem(t.account.sessionsFailed);
    else setDone(t.account.sessionsDone);
  }

  return (
    <>
      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.account.twoFactor}</h2>
        <p className={s.cardLead}>{t.account.twoFactorLead}</p>

        <span className={enabled ? `${s.status} ${s.statusOn}` : s.status}>
          {factors === null
            ? t.common.busy
            : enabled
              ? t.account.statusEnabled
              : t.account.statusDisabled}
        </span>

        {enrolling && (
          <>
            <p className={s.cardLead}>{t.account.twoFactorScan}</p>
            {enrolling.qr.startsWith("data:") ? (
              <span className={s.qr}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrolling.qr} alt={t.account.twoFactorScan} />
              </span>
            ) : null}
            <p className={s.secret}>{enrolling.secret}</p>

            <label className={s.field}>
              <span className={s.label}>{t.account.twoFactorCode}</span>
              <input
                className={`${s.input} ${s.codeInput}`}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </label>
          </>
        )}

        <div className={s.actions}>
          {enrolling ? (
            <>
              <button
                type="button"
                className={s.primary}
                onClick={confirm}
                disabled={busy || code.trim().length < 6}
              >
                {busy ? t.common.busy : t.account.twoFactorConfirm}
              </button>
              <button type="button" className={s.ghost} onClick={() => setEnrolling(null)}>
                {t.common.cancel}
              </button>
            </>
          ) : enabled ? (
            <button type="button" className={s.ghost} onClick={turnOff} disabled={busy}>
              {t.account.twoFactorDisable}
            </button>
          ) : (
            <button type="button" className={s.primary} onClick={begin} disabled={busy}>
              {busy ? t.common.busy : t.account.twoFactorEnable}
            </button>
          )}

          {problem && <span className={s.error}>{problem}</span>}
          {done && !problem && <span className={s.ok}>{done}</span>}
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.account.sessions}</h2>
        <p className={s.cardLead}>{t.account.sessionsLead}</p>
        <p className={s.note}>{t.account.sessionsNote}</p>

        <div className={s.actions}>
          <button type="button" className={s.ghost} onClick={signOutOthers} disabled={busy}>
            {busy ? t.common.busy : t.account.signOutOthers}
          </button>
        </div>
      </section>
    </>
  );
}
