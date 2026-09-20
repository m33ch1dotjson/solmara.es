"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addPropertyPhotosAction,
  deletePropertyAndPhotosAction,
  deletePropertyPhotoAction,
  updatePropertyAction,
} from "@/app/admin/properties/property-actions";
import { Lightbox } from "@/components/staff/Lightbox";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import a from "@/app/admin/account/account.module.css";
import s from "./PropertyDetail.module.css";

/**
 * One property, read first and edited on purpose — the same shape as a Process
 * Guide, so the two screens behave alike.
 *
 * Deleting is here rather than on the list. On a grid of cards a misplaced click is
 * easy; here it takes opening the property first, and then saying it twice.
 */
export function PropertyDetail({
  id,
  title,
  address,
  notes,
  added,
  photos,
}: {
  id: string;
  title: string;
  address: string;
  notes: string;
  added: string;
  photos: Array<{ id: string; url: string }>;
}) {
  const { t } = useCopy();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title, address, notes });
  const [confirming, setConfirming] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  function save() {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      form.set("title", draft.title);
      form.set("address", draft.address);
      form.set("notes", draft.notes);
      const result = await updatePropertyAction(form);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
      setMessage(result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error });
    });
  }

  function addPhotos(files: FileList) {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      for (const file of Array.from(files)) form.append("photos", file);
      const result = await addPropertyPhotosAction(form);
      if (result.ok) router.refresh();
      setMessage(result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error });
    });
  }

  function dropPhoto(photoId: string) {
    start(async () => {
      const form = new FormData();
      form.set("photoId", photoId);
      await deletePropertyPhotoAction(form);
      router.refresh();
    });
  }

  function destroy() {
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      await deletePropertyAndPhotosAction(form);
    });
  }

  const urls = photos.map((photo) => photo.url);
  const alts = photos.map((_, i) => fill(t.properties.photoAlt, { title, n: i + 1 }));

  return (
    <div className={s.page}>
      <div className={s.top}>
        <Link href="/admin/properties" className={s.back}>
          {t.properties.backToList}
        </Link>

        <div className={s.actions}>
          {editing ? (
            <>
              <button
                type="button"
                className={a.ghost}
                disabled={pending}
                onClick={() => {
                  setDraft({ title, address, notes });
                  setEditing(false);
                  setMessage(null);
                }}
              >
                {t.common.cancel}
              </button>
              <button type="button" className={a.primary} disabled={pending} onClick={save}>
                {pending ? t.common.busy : t.guides.saveChanges}
              </button>
            </>
          ) : (
            <button type="button" className={a.primary} onClick={() => setEditing(true)}>
              {t.guides.edit}
            </button>
          )}
        </div>
      </div>

      <section className={a.card}>
        {editing ? (
          <div className={a.fields}>
            <label className={a.field}>
              <span className={a.label}>{t.properties.formTitle}</span>
              <input
                className={a.input}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className={a.field}>
              <span className={a.label}>{t.properties.formAddress}</span>
              <input
                className={a.input}
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              />
            </label>
            <label className={`${a.field} ${s.wide}`}>
              <span className={a.label}>{t.properties.formNotes}</span>
              <textarea
                className={s.textarea}
                rows={4}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </label>
          </div>
        ) : (
          <>
            <h1 className={s.title}>{title}</h1>
            <p className={s.address}>{address}</p>
            {notes && <p className={s.notes}>{notes}</p>}
            <p className={s.added}>{fill(t.properties.addedOn, { date: added })}</p>
          </>
        )}

        {message && (
          <p className={message.ok ? a.ok : a.error} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.properties.formPhotos}</h2>

        {photos.length === 0 ? (
          <p className={a.cardLead}>{t.properties.noPhotos}</p>
        ) : (
          <div className={s.photos}>
            {photos.map((photo, index) => (
              <div className={s.photo} key={photo.id}>
                <button
                  type="button"
                  className={s.photoButton}
                  onClick={() => setZoom(index)}
                  title={t.common.enlarge}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={alts[index]} className={s.photoImage} />
                </button>
                <button
                  type="button"
                  className={s.photoRemove}
                  onClick={() => dropPhoto(photo.id)}
                  disabled={pending}
                  aria-label={t.common.delete}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={picker}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className={a.hiddenInput}
          onChange={(event) => {
            if (event.target.files?.length) addPhotos(event.target.files);
            event.target.value = "";
          }}
        />
        <div className={a.actions}>
          <button
            type="button"
            className={a.ghost}
            disabled={pending}
            onClick={() => picker.current?.click()}
          >
            {pending ? t.properties.uploading : t.properties.addPhotos}
          </button>
        </div>
      </section>

      <section className={a.card}>
        <h2 className={a.cardTitle}>{t.properties.deleteTitle}</h2>
        <p className={a.cardLead}>{t.properties.deleteLead}</p>
        <div className={a.actions}>
          {confirming ? (
            <>
              <button type="button" className={s.danger} disabled={pending} onClick={destroy}>
                {pending ? t.common.busy : t.common.confirmDelete}
              </button>
              <button type="button" className={a.ghost} onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </button>
            </>
          ) : (
            <button type="button" className={a.ghost} onClick={() => setConfirming(true)}>
              {t.common.delete}
            </button>
          )}
        </div>
      </section>

      {zoom !== null && (
        <Lightbox
          urls={urls}
          alts={alts}
          at={zoom}
          onMove={setZoom}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  );
}
