"use client";

import { useState, useTransition } from "react";
import { inviteMemberAction, setActiveAction, setRoleAction } from "@/app/admin/team/actions";
import { Avatar } from "@/components/ui/Avatar";
import { useCopy } from "@/components/ui/LocaleProvider";
import a from "@/app/admin/account/account.module.css";
import s from "./TeamTable.module.css";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  initials: string;
  hasSignedIn: boolean;
  since: string;
  avatarUrl: string | null;
};

const ROLES = ["ADMIN", "STAFF", "EXTERNAL"] as const;

export function TeamTable({ rows, meId }: { rows: Row[]; meId: string }) {
  const { t } = useCopy();
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("STAFF");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const roleLabel = t.team.role as Record<string, string>;

  function invite() {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("name", name);
      form.set("email", email);
      form.set("role", role);
      const result = await inviteMemberAction(form);
      if (result.ok) {
        setName("");
        setEmail("");
        setInviting(false);
      }
      setMessage(result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error });
    });
  }

  function changeRole(id: string, next: string) {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      form.set("role", next);
      const result = await setRoleAction(form);
      setMessage(result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error });
    });
  }

  function changeActive(id: string, active: boolean) {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      form.set("active", active ? "1" : "0");
      const result = await setActiveAction(form);
      setMessage(result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error });
    });
  }

  return (
    <>
      <div className={s.head}>
        <button type="button" className={a.primary} onClick={() => setInviting((open) => !open)}>
          <span aria-hidden="true">+</span> {t.team.invite}
        </button>
        {message && (
          <span className={message.ok ? a.ok : a.error}>{message.text}</span>
        )}
      </div>

      {inviting && (
        <section className={a.card}>
          <h2 className={a.cardTitle}>{t.team.invite}</h2>
          <p className={a.cardLead}>{t.team.inviteLead}</p>

          <div className={a.fields}>
            <label className={a.field}>
              <span className={a.label}>{t.newClient.name}</span>
              <input className={a.input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.common.email}</span>
              <input
                className={a.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.account.role}</span>
              <select
                className={a.select}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={a.actions}>
            <button type="button" className={a.primary} onClick={invite} disabled={pending}>
              {pending ? t.common.busy : t.team.sendInvite}
            </button>
            <button type="button" className={a.ghost} onClick={() => setInviting(false)}>
              {t.common.cancel}
            </button>
          </div>
        </section>
      )}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>{t.team.columnUser}</th>
              <th>{t.common.email}</th>
              <th>{t.account.role}</th>
              <th>{t.team.columnStatus}</th>
              <th className={s.right}>{t.team.columnActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.active ? undefined : s.dim}>
                <td>
                  <span className={s.person}>
                    <Avatar url={row.avatarUrl} initials={row.initials} size={34} />
                    <span>
                      <span className={s.name}>{row.name}</span>
                      <span className={s.since}>{row.since}</span>
                    </span>
                  </span>
                </td>
                <td className={s.muted}>{row.email}</td>
                <td>
                  <select
                    className={s.roleSelect}
                    value={row.role}
                    disabled={pending}
                    onChange={(event) => changeRole(row.id, event.target.value)}
                  >
                    {ROLES.map((option) => (
                      <option key={option} value={option}>
                        {roleLabel[option]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span
                    className={
                      !row.active
                        ? `${s.pill} ${s.pillOff}`
                        : row.hasSignedIn
                          ? `${s.pill} ${s.pillOn}`
                          : `${s.pill} ${s.pillWait}`
                    }
                  >
                    {!row.active
                      ? t.team.statusDisabled
                      : row.hasSignedIn
                        ? t.team.statusActive
                        : t.team.statusInvited}
                  </span>
                </td>
                <td className={s.right}>
                  {row.id === meId ? (
                    <span className={s.muted}>{t.team.you}</span>
                  ) : (
                    <button
                      type="button"
                      className={a.ghost}
                      disabled={pending}
                      onClick={() => changeActive(row.id, !row.active)}
                    >
                      {row.active ? t.team.disable : t.team.enable}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.team.whatRolesMean}</h2>
        <ul className={s.rules}>
          <li>
            <strong>{roleLabel.ADMIN}</strong> — {t.team.ruleAdmin}
          </li>
          <li>
            <strong>{roleLabel.STAFF}</strong> — {t.team.ruleStaff}
          </li>
          <li>
            <strong>{roleLabel.EXTERNAL}</strong> — {t.team.ruleExternal}
          </li>
        </ul>
        <p className={a.note}>{t.team.externalNotYet}</p>
      </section>
    </>
  );
}
