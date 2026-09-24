"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addTaskAction,
  deleteTaskAction,
  saveTaskAction,
  toggleTaskAction,
} from "@/app/admin/tasks/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import { RichTextEditor } from "./RichTextEditor";
import a from "@/app/admin/account/account.module.css";
import s from "./TaskList.module.css";

export type TaskRow = {
  id: string;
  title: string;
  body: string;
  done: boolean;
  dueDate: string;
  /** Already formatted for reading; empty when there is no deadline. */
  due: string;
  overdue: boolean;
  assignedTo: string;
  assigneeName: string;
  clientId: string;
  clientName: string;
  doneOn: string;
};

const FILTERS = ["OPEN", "DONE", "ALL"] as const;

/*
 * The to-do list.
 *
 * A line and a tickbox, and the detail folded up behind it. Adding one costs a
 * sentence and Enter — anything more ceremonious and the list stops being used,
 * which is the only way a to-do list can really fail.
 *
 * Ticking does not make a task disappear. It greys out, strikes through and sinks
 * to the bottom, because "did we already do that?" is asked more often than
 * anything else on this screen.
 */
export function TaskList({
  rows,
  staff,
  clients,
}: {
  rows: TaskRow[];
  staff: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
}) {
  const { t } = useCopy();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("OPEN");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskRow | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  /* Which boxes the browser has already ticked, so the row reacts at once and does
     not wait for the server to agree. */
  const [ticking, setTicking] = useState<Record<string, boolean>>({});

  const filterLabel = t.tasksPage.filter as Record<string, string>;

  const shown = useMemo(() => {
    const isDone = (row: TaskRow) => ticking[row.id] ?? row.done;
    if (filter === "ALL") return rows;
    return rows.filter((row) => (filter === "DONE" ? isDone(row) : !isDone(row)));
  }, [rows, filter, ticking]);

  const openCount = rows.filter((row) => !(ticking[row.id] ?? row.done)).length;

  function add() {
    const value = title.trim();
    if (value === "") return;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("title", value);
      const result = await addTaskAction(form);
      if (result.ok) {
        setTitle("");
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  function toggle(row: TaskRow) {
    const next = !(ticking[row.id] ?? row.done);
    setTicking((current) => ({ ...current, [row.id]: next }));
    start(async () => {
      await toggleTaskAction(row.id, next);
      router.refresh();
    });
  }

  function open(row: TaskRow) {
    if (openId === row.id) {
      setOpenId(null);
      setDraft(null);
      return;
    }
    setOpenId(row.id);
    setDraft({ ...row });
    setMessage(null);
  }

  function save() {
    if (!draft) return;
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", draft.id);
      form.set("title", draft.title);
      form.set("body", draft.body);
      form.set("dueDate", draft.dueDate);
      form.set("assignedTo", draft.assignedTo);
      form.set("clientId", draft.clientId);
      const result = await saveTaskAction(form);
      if (result.ok) {
        setOpenId(null);
        setDraft(null);
        router.refresh();
      }
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
    });
  }

  function destroy(id: string) {
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      await deleteTaskAction(form);
      setOpenId(null);
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className={s.wrap}>
      {/* ---------------------------------------------------------- adding */}
      <div className={s.adder}>
        <input
          className={s.addInput}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={t.tasksPage.addPlaceholder}
          aria-label={t.tasksPage.addPlaceholder}
        />
        <button
          type="button"
          className={a.primary}
          onClick={add}
          disabled={pending || title.trim() === ""}
        >
          <span aria-hidden="true">+</span> {t.tasksPage.add}
        </button>
      </div>

      <div className={s.head}>
        <div className={s.filters} role="group" aria-label={t.tasksPage.filterLabel}>
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
        <span className={s.count}>
          {fill(openCount === 1 ? t.tasksPage.openOne : t.tasksPage.openMany, { n: openCount })}
        </span>
      </div>

      {message && !openId && (
        <p className={message.ok ? a.ok : a.error} role="status">
          {message.text}
        </p>
      )}

      {/* ----------------------------------------------------------- the list */}
      {shown.length === 0 ? (
        <p className={s.empty}>{rows.length === 0 ? t.tasksPage.empty : t.tasksPage.noneHere}</p>
      ) : (
        <ul className={s.list}>
          {shown.map((row) => {
            const done = ticking[row.id] ?? row.done;
            const expanded = openId === row.id;

            return (
              <li key={row.id} className={done ? `${s.item} ${s.itemDone}` : s.item}>
                <div className={s.row}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={row.title}
                    className={done ? `${s.box} ${s.boxOn}` : s.box}
                    onClick={() => toggle(row)}
                  >
                    {done && (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    )}
                  </button>

                  <button type="button" className={s.titleButton} onClick={() => open(row)}>
                    <span className={s.title}>{row.title}</span>
                    <span className={s.meta}>
                      {row.due && (
                        <span className={row.overdue && !done ? s.dueLate : s.due}>{row.due}</span>
                      )}
                      {row.assigneeName && <span className={s.tag}>{row.assigneeName}</span>}
                      {row.clientName && <span className={s.tag}>{row.clientName}</span>}
                      {done && row.doneOn && <span className={s.doneOn}>{row.doneOn}</span>}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={expanded ? `${s.chevron} ${s.chevronOpen}` : s.chevron}
                    aria-expanded={expanded}
                    aria-label={expanded ? t.tasksPage.collapse : t.tasksPage.expand}
                    onClick={() => open(row)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {expanded && draft && (
                  <div className={s.panel}>
                    <div className={s.fields}>
                      <label className={s.field}>
                        <span className={a.label}>{t.tasksPage.taskTitle}</span>
                        <input
                          className={a.input}
                          value={draft.title}
                          onChange={(event) =>
                            setDraft({ ...draft, title: event.target.value })
                          }
                        />
                      </label>
                      <label className={s.field}>
                        <span className={a.label}>{t.tasksPage.due}</span>
                        <input
                          className={a.input}
                          type="date"
                          value={draft.dueDate}
                          onChange={(event) =>
                            setDraft({ ...draft, dueDate: event.target.value })
                          }
                        />
                      </label>
                      <label className={s.field}>
                        <span className={a.label}>{t.tasksPage.assignee}</span>
                        <select
                          className={a.select}
                          value={draft.assignedTo}
                          onChange={(event) =>
                            setDraft({ ...draft, assignedTo: event.target.value })
                          }
                        >
                          <option value="">{t.tasksPage.nobody}</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={s.field}>
                        <span className={a.label}>{t.tasksPage.client}</span>
                        <select
                          className={a.select}
                          value={draft.clientId}
                          onChange={(event) =>
                            setDraft({ ...draft, clientId: event.target.value })
                          }
                        >
                          <option value="">{t.tasksPage.noClient}</option>
                          {clients.map((row2) => (
                            <option key={row2.id} value={row2.id}>
                              {row2.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <p className={s.bodyLabel}>{t.tasksPage.details}</p>
                    <RichTextEditor
                      guideId={draft.id}
                      value={draft.body}
                      onChange={(html) => setDraft({ ...draft, body: html })}
                      allowImages={false}
                      compact
                    />

                    <div className={s.panelActions}>
                      <button
                        type="button"
                        className={a.primary}
                        disabled={pending}
                        onClick={save}
                      >
                        {pending ? t.common.busy : t.guides.saveChanges}
                      </button>
                      <button
                        type="button"
                        className={a.ghost}
                        onClick={() => {
                          setOpenId(null);
                          setDraft(null);
                          setMessage(null);
                        }}
                      >
                        {t.common.cancel}
                      </button>

                      {row.clientId && (
                        <Link href={`/admin/clients/${row.clientId}`} className={a.ghost}>
                          {t.tasksPage.openClient}
                        </Link>
                      )}

                      <button
                        type="button"
                        className={s.delete}
                        disabled={pending}
                        onClick={() => destroy(row.id)}
                      >
                        {t.common.delete}
                      </button>

                      {message && (
                        <span className={message.ok ? a.ok : a.error}>{message.text}</span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
