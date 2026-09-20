"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteGuideAction,
  duplicateGuideAction,
  removeGuideFileAction,
  saveGuideAction,
  uploadGuideFileAction,
} from "@/app/admin/process-guide/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { GuideMenu } from "./GuideMenu";
import { RichTextEditor } from "./RichTextEditor";
import s from "./GuideDocument.module.css";
import list from "./GuideList.module.css";

type Attachment = { id: string; filename: string; sizeBytes: number | null };

function readableSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A guide as a document: read by default, edited on purpose.
 *
 * The read view and the edit view are the same layout with the same width and the
 * same type, so pressing Edit does not move the text you were reading.
 */
export function GuideDocument({
  id,
  title,
  category,
  content,
  updated,
  attachments,
  startInEdit,
  printOnOpen,
}: {
  id: string;
  title: string;
  category: string;
  content: string;
  updated: string;
  attachments: Attachment[];
  startInEdit: boolean;
  printOnOpen: boolean;
}) {
  const { t } = useCopy();
  const router = useRouter();
  const categories = t.guides.category as Record<string, string>;

  const [editing, setEditing] = useState(startInEdit);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftContent, setDraftContent] = useState(content);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [busy, startBusy] = useTransition();

  const attachInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!printOnOpen) return;
    // After paint, so the document is on screen before the dialog opens over it.
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [printOnOpen]);

  function save() {
    setError(null);
    startSaving(async () => {
      const form = new FormData();
      form.set("id", id);
      form.set("title", draftTitle);
      form.set("category", draftCategory);
      form.set("content", draftContent);
      const result = await saveGuideAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      // The server sanitises what it stored; re-reading the page is how the editor
      // and the database stop disagreeing about what was actually saved.
      router.refresh();
    });
  }

  function cancel() {
    setDraftTitle(title);
    setDraftCategory(category);
    setDraftContent(content);
    setError(null);
    setEditing(false);
  }

  function addAttachment(file: File) {
    setError(null);
    startBusy(async () => {
      const form = new FormData();
      form.set("guideId", id);
      form.set("kind", "ATTACHMENT");
      form.set("file", file);
      const result = await uploadGuideFileAction(form);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function dropAttachment(fileId: string) {
    startBusy(async () => {
      const form = new FormData();
      form.set("fileId", fileId);
      await removeGuideFileAction(form);
      router.refresh();
    });
  }

  return (
    <div className={s.page}>
      <div className={s.top}>
        <Link href="/admin/process-guide" className={s.back}>
          {t.guides.backToList}
        </Link>

        <div className={s.actions}>
          {editing ? (
            <>
              <button type="button" className={s.ghost} onClick={cancel} disabled={saving}>
                {t.common.cancel}
              </button>
              <button type="button" className={s.primary} onClick={save} disabled={saving}>
                {saving ? t.common.busy : t.guides.saveChanges}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={s.ghost} onClick={() => window.print()}>
                {t.guides.print}
              </button>
              <button type="button" className={s.primary} onClick={() => setEditing(true)}>
                {t.guides.edit}
              </button>
              <GuideMenu
                placement="down"
                onEdit={() => setEditing(true)}
                onPrint={() => window.print()}
                onDuplicate={() =>
                  startBusy(async () => {
                    const form = new FormData();
                    form.set("id", id);
                    await duplicateGuideAction(form);
                  })
                }
                onDelete={() =>
                  startBusy(async () => {
                    const form = new FormData();
                    form.set("id", id);
                    await deleteGuideAction(form);
                  })
                }
              />
            </>
          )}
        </div>
      </div>

      <article className={s.document}>
        {editing ? (
          <>
            <input
              className={s.titleInput}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label={t.guides.titleLabel}
              placeholder={t.guides.titleLabel}
            />
            <label className={s.categoryField}>
              <span className={s.categoryLabel}>{t.guides.categoryLabel}</span>
              <select
                className={s.select}
                value={draftCategory}
                onChange={(event) => setDraftCategory(event.target.value)}
              >
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <h1 className={s.title}>{title}</h1>
            <p className={s.meta}>
              <span className={list.badge}>{categories[category]}</span>
              <span className={s.updated}>{t.guides.lastUpdated.replace("{date}", updated)}</span>
            </p>
          </>
        )}

        <hr className={s.rule} />

        {editing ? (
          <RichTextEditor guideId={id} value={draftContent} onChange={setDraftContent} />
        ) : content.trim() === "" ? (
          <p className={s.blank}>{t.guides.stillEmpty}</p>
        ) : (
          /*
           * The content was sanitised by lib/sanitize.ts before it was stored, and
           * it is staff-written and staff-read. This is the only place in the app
           * that renders HTML it did not write itself.
           */
          <div className={s.body} dangerouslySetInnerHTML={{ __html: content }} />
        )}

        {error && <p className={s.error}>{error}</p>}

        {(attachments.length > 0 || editing) && (
          <section className={s.attachments}>
            <h2 className={s.attachTitle}>{t.guides.attachments}</h2>

            {attachments.length === 0 ? (
              <p className={s.attachEmpty}>{t.guides.noAttachments}</p>
            ) : (
              <ul className={s.attachList}>
                {attachments.map((file) => (
                  <li key={file.id} className={s.attachRow}>
                    <a
                      href={`/admin/process-guide/file/${file.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={s.attachName}
                    >
                      {file.filename}
                    </a>
                    <span className={s.attachSize}>{readableSize(file.sizeBytes)}</span>
                    {editing && (
                      <button
                        type="button"
                        className={s.attachRemove}
                        onClick={() => dropAttachment(file.id)}
                        disabled={busy}
                      >
                        {t.common.delete}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editing && (
              <>
                <input
                  ref={attachInput}
                  type="file"
                  className={s.hiddenInput}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) addAttachment(file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className={s.ghost}
                  onClick={() => attachInput.current?.click()}
                  disabled={busy}
                >
                  {busy ? t.common.busy : t.guides.addAttachment}
                </button>
              </>
            )}
          </section>
        )}
      </article>
    </div>
  );
}
