"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  createAccountAction,
  newPasswordAction,
  sendResetAction,
  setAccessAction,
  suggestPasswordAction,
} from "@/app/admin/client-accounts/actions";
import { Avatar } from "@/components/ui/Avatar";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import type { AccountStatus } from "@/lib/access";
import { fill } from "@/lib/i18n";
import a from "@/app/admin/account/account.module.css";
import s from "./ClientAccounts.module.css";

export type AccountView = {
  clientId: string;
  contactId: string | null;
  code: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  /** The address on the file, used when creating an account. */
  email: string;
  loginEmail: string;
  status: AccountStatus;
  hasPassword: boolean;
  emailVerified: boolean;
  selfRegistered: boolean;
  created: string;
  lastLogin: string;
};

const FILTERS = ["ALL", "NO_ACCOUNT", "INVITED", "ACTIVE", "DISABLED"] as const;

/*
 * Who can sign in, and what to do about it.
 *
 * One row per client, account or not: "which of my clients cannot get in" is the
 * question this screen exists to answer, and a table of only the ones that already
 * have an account cannot answer it.
 *
 * The passwords are the part worth being careful about. Nothing on this screen ever
 * displays an existing one, because nothing anywhere can — Supabase keeps a hash.
 * What an admin can do is replace it with a temporary one, which is shown in a modal
 * the one time it exists in readable form, and never again afterwards.
 */
export function ClientAccounts({
  rows,
  loginUrl,
  canManage,
}: {
  rows: AccountView[];
  loginUrl: string;
  /** Only an admin gets the buttons; everybody on staff may look. */
  canManage: boolean;
}) {
  const { t } = useCopy();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  /** The client whose create-account form is open. */
  const [creating, setCreating] = useState<AccountView | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  /** The one-time password modal; null whenever there is nothing to reveal. */
  const [secret, setSecret] = useState<{
    title: string;
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);

  const statusLabel = t.access as unknown as Record<string, string>;
  const filterLabel: Record<string, string> = {
    ALL: t.clients.filterAll,
    NO_ACCOUNT: statusLabel.NO_ACCOUNT ?? "",
    INVITED: statusLabel.INVITED ?? "",
    ACTIVE: statusLabel.ACTIVE ?? "",
    DISABLED: statusLabel.DISABLED ?? "",
  };

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "ALL") {
        // "Invited" covers the expired link too: from the office's point of view
        // both mean a link was sent and nobody is inside yet.
        const matches =
          filter === "INVITED"
            ? row.status === "INVITED" || row.status === "EXPIRED"
            : filter === "ACTIVE"
              ? row.status === "ACTIVE" || row.status === "UNVERIFIED"
              : row.status === filter;
        if (!matches) return false;
      }
      if (needle === "") return true;
      return [row.name, row.email, row.loginEmail, row.code].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [rows, query, filter]);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(null);
    start(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { ok: true, text: result.message ?? "" }
          : { ok: false, text: result.error ?? "" },
      );
    });
  }

  function openCreate(row: AccountView) {
    setMessage(null);
    setCreating(row);
    setNewEmail(row.loginEmail || row.email);
    setNewPassword("");
    start(async () => setNewPassword(await suggestPasswordAction()));
  }

  function create() {
    if (!creating) return;
    const row = creating;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", row.clientId);
      form.set("email", newEmail);
      form.set("password", newPassword);
      const result = await createAccountAction(form);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setCreating(null);
      setSecret({
        title: t.accounts.createdTitle,
        email: result.email,
        password: result.password,
        loginUrl: result.loginUrl,
      });
    });
  }

  function temporaryPassword(row: AccountView) {
    if (!row.contactId) return;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", row.clientId);
      form.set("contactId", row.contactId ?? "");
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

  return (
    <>
      <div className={s.controls}>
        <input
          type="search"
          className={s.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.accounts.searchPlaceholder}
          aria-label={t.accounts.searchPlaceholder}
        />
        <CopyButton value={loginUrl} label={t.accounts.copyLoginLink} className={a.ghost} />
      </div>

      <div className={s.filters} role="group" aria-label={t.access.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? `${s.chip} ${s.chipOn}` : s.chip}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {filterLabel[option]}
          </button>
        ))}
      </div>

      <p className={s.count}>
        {fill(shown.length === 1 ? t.accounts.countOne : t.accounts.countMany, {
          n: shown.length,
        })}
        {message && (
          <span className={message.ok ? a.ok : a.error}> · {message.text}</span>
        )}
      </p>

      {shown.length === 0 ? (
        <p className={s.empty}>{t.accounts.noMatch}</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t.accounts.columnClient}</th>
                <th>{t.accounts.columnLogin}</th>
                <th>{t.accounts.columnStatus}</th>
                <th>{t.accounts.columnActivity}</th>
                <th className={s.right}>{t.accounts.columnActions}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.clientId} className={row.status === "DISABLED" ? s.dim : undefined}>
                  <td>
                    <Link href={`/admin/clients/${row.clientId}`} className={s.person}>
                      <Avatar url={row.avatarUrl} initials={row.initials} size={34} />
                      <span>
                        <span className={s.name}>{row.name}</span>
                        <span className={s.sub}>{row.code}</span>
                      </span>
                    </Link>
                  </td>

                  <td>
                    <span className={s.login}>{row.loginEmail || row.email}</span>
                    <span className={s.sub}>
                      {/* Dots, not a password: a visual note that one exists. */}
                      {row.hasPassword ? (
                        <span title={t.accounts.passwordSet}>
                          {t.accounts.password}: ••••••••••••
                        </span>
                      ) : (
                        t.accounts.noPassword
                      )}
                    </span>
                  </td>

                  <td>
                    <span className={`${s.pill} ${s[`pill${row.status}`] ?? ""}`}>
                      {statusLabel[row.status]}
                    </span>
                    {row.selfRegistered && (
                      <span className={s.sub}>{t.accounts.selfRegistered}</span>
                    )}
                  </td>

                  <td className={s.muted}>
                    <span className={s.activity}>
                      {t.accounts.lastLogin}: {row.lastLogin || t.accounts.never}
                    </span>
                    <span className={s.sub}>
                      {row.created
                        ? `${t.accounts.created}: ${row.created}`
                        : t.access.NO_ACCOUNT}
                    </span>
                    {row.contactId && (
                      <span className={s.sub}>
                        {t.accounts.verified}:{" "}
                        {row.emailVerified ? t.accounts.yes : t.accounts.no}
                      </span>
                    )}
                  </td>

                  <td className={s.right}>
                    {canManage ? (
                      <RowMenu
                        busy={pending}
                        items={[
                          {
                            label: t.accounts.openClient,
                            href: `/admin/clients/${row.clientId}`,
                          },
                          !row.hasPassword
                            ? { label: t.accounts.createAccount, onClick: () => openCreate(row) }
                            : {
                                label: t.accounts.newPassword,
                                onClick: () => temporaryPassword(row),
                              },
                          row.hasPassword
                            ? {
                                label: t.accounts.sendReset,
                                onClick: () =>
                                  run(async () => {
                                    const form = new FormData();
                                    form.set("email", row.loginEmail || row.email);
                                    return sendResetAction(form);
                                  }),
                              }
                            : null,
                          { label: t.accounts.copyLoginLink, copy: loginUrl },
                          row.contactId
                            ? {
                                label:
                                  row.status === "DISABLED"
                                    ? t.accounts.enable
                                    : t.accounts.disable,
                                danger: row.status !== "DISABLED",
                                onClick: () =>
                                  run(async () => {
                                    const form = new FormData();
                                    form.set("clientId", row.clientId);
                                    form.set("contactId", row.contactId ?? "");
                                    form.set("disabled", row.status === "DISABLED" ? "0" : "1");
                                    return setAccessAction(form);
                                  }),
                              }
                            : null,
                        ]}
                      />
                    ) : (
                      <Link href={`/admin/clients/${row.clientId}`} className={a.ghost}>
                        {t.accounts.openClient}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------- create account */}
      {creating && (
        <Modal title={t.accounts.createTitle} onClose={() => setCreating(null)}>
          <p className={a.cardLead}>{t.accounts.createLead}</p>

          <div className={a.fields}>
            <label className={a.field}>
              <span className={a.label}>{t.accounts.clientLabel}</span>
              <input className={a.input} value={creating.name} readOnly aria-readonly="true" />
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
            <button type="button" className={a.primary} onClick={create} disabled={pending}>
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
            <button type="button" className={a.ghost} onClick={() => setCreating(null)}>
              {t.common.cancel}
            </button>
          </div>

          {message && !message.ok && <p className={a.error}>{message.text}</p>}
        </Modal>
      )}

      {/* ------------------------------------------------ the one-time password */}
      {secret && <SecretModal secret={secret} onClose={() => setSecret(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------- the modal */

/*
 * The only moment a password is readable.
 *
 * It lives in this component's state and nowhere else: not in our database, not in
 * the log, not in an email. Closing the modal drops it, which is exactly what the
 * warning above the box promises.
 */
export function SecretModal({
  secret,
  onClose,
}: {
  secret: { title: string; email: string; password: string; loginUrl: string };
  onClose: () => void;
}) {
  const { t } = useCopy();

  return (
    <Modal title={secret.title} onClose={onClose}>
      <p className={s.warning}>{t.accounts.onceWarning}</p>

      <div className={s.secretField}>
        <span className={a.label}>{t.accounts.emailLabel}</span>
        <code className={s.secretValue}>{secret.email}</code>
      </div>

      <div className={s.secretField}>
        <span className={a.label}>{t.accounts.temporaryPassword}</span>
        <code className={`${s.secretValue} ${s.secretPassword}`}>{secret.password}</code>
      </div>

      <p className={a.note}>{t.accounts.sendSecurely}</p>

      <div className={a.actions}>
        <CopyButton value={secret.password} label={t.accounts.copyPassword} className={a.primary} />
        <CopyButton value={secret.email} label={t.accounts.copyEmail} className={a.ghost} />
        <CopyButton value={secret.loginUrl} label={t.accounts.copyLoginLink} className={a.ghost} />
        <button type="button" className={a.ghost} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </Modal>
  );
}

/** Copy, and say so for a moment. Falls back to selecting nothing rather than failing. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  /** A CSS-module key, which the compiler types as possibly missing. */
  className: string | undefined;
}) {
  const { t } = useCopy();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? t.common.copied : label}
    </button>
  );
}

/* -------------------------------------------------------------------- row menu */

type MenuItem =
  | { label: string; href: string }
  | { label: string; copy: string }
  | { label: string; onClick: () => void; danger?: boolean }
  | null;

/** The ••• at the end of a row. Seven actions do not fit in a cell as buttons. */
function RowMenu({ items, busy }: { items: MenuItem[]; busy: boolean }) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={s.menuWrap} ref={box}>
      <button
        type="button"
        className={s.menuButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.accounts.columnActions}
        disabled={busy}
        onClick={() => setOpen((was) => !was)}
      >
        •••
      </button>

      {open && (
        <div className={s.menu} role="menu">
          {items.filter(Boolean).map((item, index) => {
            const entry = item as Exclude<MenuItem, null>;
            if ("href" in entry) {
              return (
                <Link
                  key={index}
                  /* Built from an id at runtime, so typedRoutes cannot infer it. */
                  href={entry.href as Route}
                  className={s.menuItem}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {entry.label}
                </Link>
              );
            }
            if ("copy" in entry) {
              return (
                <button
                  key={index}
                  type="button"
                  className={s.menuItem}
                  role="menuitem"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(entry.copy);
                    } catch {
                      /* A refused clipboard is not worth an error message here. */
                    }
                    setOpen(false);
                  }}
                >
                  {entry.label}
                </button>
              );
            }
            return (
              <button
                key={index}
                type="button"
                className={entry.danger ? `${s.menuItem} ${s.menuDanger}` : s.menuItem}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  entry.onClick();
                }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
