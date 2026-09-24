"use client";

import { useState, useTransition } from "react";
import {
  createAccountAction,
  newPasswordAction,
  sendResetAction,
  setAccessAction,
  suggestPasswordAction,
} from "@/app/admin/client-accounts/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import type { AccountStatus } from "@/lib/access";
import { CopyButton, SecretModal } from "./ClientAccounts";
import { InviteButton } from "./InviteButton";
import a from "@/app/admin/account/account.module.css";
import s from "./PortalAccessCard.module.css";

/*
 * Portal access, on the page about one client.
 *
 * The same five actions as the Client Accounts screen, with the state spelled out in
 * a sentence rather than a pill: this is the page somebody opens when a client has
 * rung up saying they cannot get in, and the answer should be readable, not decoded.
 *
 * Every action goes through the same admin-only server actions as the overview, so
 * there is one place where an account can be changed and one place that checks who
 * is allowed to.
 */
export function PortalAccessCard({
  clientId,
  clientName,
  contactId,
  status,
  loginEmail,
  fileEmail,
  emailVerified,
  created,
  lastLogin,
  inviteLine,
  loginUrl,
  canManage,
}: {
  clientId: string;
  clientName: string;
  contactId: string | null;
  status: AccountStatus;
  /** Empty when there is no account yet. */
  loginEmail: string;
  /** The address on the client file, which is what a new account starts from. */
  fileEmail: string;
  emailVerified: boolean;
  created: string;
  lastLogin: string;
  /** The invite history line, already worded and formatted by the page. */
  inviteLine: string | null;
  loginUrl: string;
  canManage: boolean;
}) {
  const { t } = useCopy();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState(fileEmail);
  const [newPassword, setNewPassword] = useState("");
  const [secret, setSecret] = useState<{
    title: string;
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);

  const hasAccount = contactId !== null && loginEmail !== "";
  const statusLabel = t.access as unknown as Record<string, string>;

  const explained =
    status === "DISABLED"
      ? t.access.disabledExplain
      : status === "UNVERIFIED"
        ? t.access.unverifiedExplain
        : status === "ACTIVE"
          ? t.access.activePlain
          : status === "INVITED"
            ? (inviteLine ?? t.access.noneExplain)
            : status === "EXPIRED"
              ? t.access.expiredExplain
              : t.access.noneExplain;

  function openCreate() {
    setMessage(null);
    setNewEmail(loginEmail || fileEmail);
    setCreating(true);
    start(async () => setNewPassword(await suggestPasswordAction()));
  }

  function create() {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", clientId);
      form.set("email", newEmail);
      form.set("password", newPassword);
      const result = await createAccountAction(form);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setCreating(false);
      setSecret({
        title: t.accounts.createdTitle,
        email: result.email,
        password: result.password,
        loginUrl: result.loginUrl,
      });
    });
  }

  function temporaryPassword() {
    if (!contactId) return;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", clientId);
      form.set("contactId", contactId);
      const result = await newPasswordAction(form);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setSecret({
        title: t.accounts.newPasswordTitle,
        email: result.email,
        password: result.password,
        loginUrl: result.loginUrl,
      });
    });
  }

  function sendReset() {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("email", loginEmail || fileEmail);
      const result = await sendResetAction(form);
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
    });
  }

  function toggleAccess() {
    if (!contactId) return;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", clientId);
      form.set("contactId", contactId);
      form.set("disabled", status === "DISABLED" ? "0" : "1");
      const result = await setAccessAction(form);
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
    });
  }

  return (
    <div className={s.card}>
      <p className={s.state}>
        <span className={`${s.dot} ${s[`dot${status}`] ?? ""}`} aria-hidden="true" />
        {statusLabel[status]}
      </p>
      <p className={s.line}>{explained}</p>

      {hasAccount && (
        <dl className={s.facts}>
          <div className={s.fact}>
            <dt className={s.factLabel}>{t.accounts.emailLabel}</dt>
            <dd className={s.factValue}>{loginEmail}</dd>
          </div>
          <div className={s.fact}>
            <dt className={s.factLabel}>{t.accounts.verified}</dt>
            <dd className={s.factValue}>{emailVerified ? t.accounts.yes : t.accounts.no}</dd>
          </div>
          <div className={s.fact}>
            <dt className={s.factLabel}>{t.accounts.lastLogin}</dt>
            <dd className={s.factValue}>{lastLogin || t.accounts.never}</dd>
          </div>
          <div className={s.fact}>
            <dt className={s.factLabel}>{t.accounts.created}</dt>
            <dd className={s.factValue}>{created || t.common.blank}</dd>
          </div>
          <div className={s.fact}>
            <dt className={s.factLabel}>{t.accounts.password}</dt>
            {/* Dots only. There is no reveal here because there is nothing to
                reveal: what we keep is a hash. */}
            <dd className={s.factValue} title={t.accounts.passwordSet}>
              ••••••••••••
            </dd>
          </div>
        </dl>
      )}

      {!hasAccount && inviteLine && <p className={s.quiet}>{inviteLine}</p>}
      <p className={s.quiet}>{t.access.howLoginsHappen}</p>

      {canManage && (
        <div className={s.actions}>
          {hasAccount ? (
            <>
              <button type="button" className={a.ghost} disabled={pending} onClick={sendReset}>
                {t.accounts.sendReset}
              </button>
              <button
                type="button"
                className={a.ghost}
                disabled={pending}
                onClick={temporaryPassword}
              >
                {t.accounts.newPassword}
              </button>
              <CopyButton value={loginUrl} label={t.accounts.copyLoginLink} className={a.ghost} />
              <button
                type="button"
                className={status === "DISABLED" ? a.ghost : s.danger}
                disabled={pending}
                onClick={toggleAccess}
              >
                {status === "DISABLED" ? t.accounts.enable : t.accounts.disable}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={a.primary} disabled={pending} onClick={openCreate}>
                {t.accounts.createAccount}
              </button>
              {/* The other route: a link they use themselves, which also lets them
                  pick their own password rather than being handed one. */}
              <InviteButton
                clientId={clientId}
                clientName={clientName}
                label={status === "NO_ACCOUNT" ? undefined : t.access.newLink}
              />
            </>
          )}
        </div>
      )}

      {message && <p className={message.ok ? a.ok : a.error}>{message.text}</p>}

      {creating && (
        <Modal title={t.accounts.createTitle} onClose={() => setCreating(false)}>
          <p className={a.cardLead}>{t.accounts.createLead}</p>
          <div className={a.fields}>
            <label className={a.field}>
              <span className={a.label}>{t.accounts.clientLabel}</span>
              <input className={a.input} value={clientName} readOnly aria-readonly="true" />
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.accounts.emailLabel}</span>
              <input
                className={a.input}
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.accounts.temporaryPassword}</span>
              <input
                className={a.input}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
          </div>
          <div className={a.actions}>
            <button type="button" className={a.primary} disabled={pending} onClick={create}>
              {pending ? t.common.busy : t.accounts.createShort}
            </button>
            <button
              type="button"
              className={a.ghost}
              disabled={pending}
              onClick={() => start(async () => setNewPassword(await suggestPasswordAction()))}
            >
              {t.accounts.generate}
            </button>
            <button type="button" className={a.ghost} onClick={() => setCreating(false)}>
              {t.common.cancel}
            </button>
          </div>
          {message && !message.ok && <p className={a.error}>{message.text}</p>}
        </Modal>
      )}

      {secret && <SecretModal secret={secret} onClose={() => setSecret(null)} />}
    </div>
  );
}
