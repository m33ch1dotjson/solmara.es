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
import { RichTextEditor } from "@/components/staff/RichTextEditor";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import a from "@/app/admin/account/account.module.css";
import s from "./PropertyDetail.module.css";

/**
 * One property, as a listing.
 *
 * This used to be an edit screen with the photographs at the bottom: everything you
 * could change about a house, and nothing that made you want to look at it. It reads
 * like an advertisement now — photographs first, then the facts, then the text —
 * and it is read-only until you press Edit, the same as a Process Guide.
 */
export function PropertyDetail({
  id,
  title,
  address,
  description,
  price,
  priceInput,
  bedrooms,
  bathrooms,
  areaM2,
  added,
  photos,
}: {
  id: string;
  title: string;
  address: string;
  /** Sanitised HTML, stored that way. */
  description: string;
  /** Already formatted for reading; empty when there is no price. */
  price: string;
  /** The same amount as plain digits, for the field. */
  priceInput: string;
  bedrooms: string;
  bathrooms: string;
  areaM2: string;
  added: string;
  photos: Array<{ id: string; url: string }>;
}) {
  const { t } = useCopy();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title,
    address,
    description,
    price: priceInput,
    bedrooms,
    bathrooms,
    areaM2,
  });
  const [confirming, setConfirming] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function save() {
    setMessage(null);
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      for (const [key, value] of Object.entries(draft)) form.set(key, value);
      const result = await updatePropertyAction(form);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
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
      setMessage(
        result.ok ? { ok: true, text: result.message ?? "" } : { ok: false, text: result.error },
      );
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

  /* The facts, as a row of small labelled numbers. Empty ones are left out. */
  const facts: Array<[string, string]> = [
    [t.properties.bedrooms, bedrooms],
    [t.properties.bathrooms, bathrooms],
    [t.properties.area, areaM2 ? `${areaM2} m²` : ""],
  ].filter((entry): entry is [string, string] => entry[1] !== "");

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
                  setDraft({
                    title,
                    address,
                    description,
                    price: priceInput,
                    bedrooms,
                    bathrooms,
                    areaM2,
                  });
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

      {/* ------------------------------------------------------------ gallery */}
      {photos.length > 0 && (
        <div className={photos.length === 1 ? `${s.gallery} ${s.galleryOne}` : s.gallery}>
          <button
            type="button"
            className={s.hero}
            onClick={() => setZoom(0)}
            title={t.common.enlarge}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[0]?.url} alt={alts[0]} className={s.heroImage} />
          </button>

          {photos.length > 1 && (
            <div className={s.side}>
              {photos.slice(1, 5).map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  className={s.sideShot}
                  onClick={() => setZoom(index + 1)}
                  title={t.common.enlarge}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={alts[index + 1]} className={s.sideImage} />
                  {/* The fourth thumbnail carries "+3 more" when there are more. */}
                  {index === 3 && photos.length > 5 && (
                    <span className={s.more}>+{photos.length - 5}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- the listing */}
      <div className={s.columns}>
        <div className={s.main}>
          {editing ? (
            <section className={a.card}>
              <div className={a.fields}>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.formTitle}</span>
                  <input
                    className={a.input}
                    value={draft.title}
                    onChange={(event) => set("title", event.target.value)}
                  />
                </label>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.formAddress}</span>
                  <input
                    className={a.input}
                    value={draft.address}
                    onChange={(event) => set("address", event.target.value)}
                  />
                </label>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.price}</span>
                  <input
                    className={a.input}
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(event) => set("price", event.target.value)}
                    placeholder="320.000"
                  />
                </label>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.bedrooms}</span>
                  <input
                    className={a.input}
                    inputMode="numeric"
                    value={draft.bedrooms}
                    onChange={(event) => set("bedrooms", event.target.value)}
                  />
                </label>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.bathrooms}</span>
                  <input
                    className={a.input}
                    inputMode="numeric"
                    value={draft.bathrooms}
                    onChange={(event) => set("bathrooms", event.target.value)}
                  />
                </label>
                <label className={a.field}>
                  <span className={a.label}>{t.properties.area}</span>
                  <input
                    className={a.input}
                    inputMode="numeric"
                    value={draft.areaM2}
                    onChange={(event) => set("areaM2", event.target.value)}
                  />
                </label>
              </div>

              <p className={s.editorLabel}>{t.properties.descriptionLabel}</p>
              <RichTextEditor
                guideId={id}
                value={draft.description}
                onChange={(html) => set("description", html)}
                /* The gallery above is where pictures belong. */
                allowImages={false}
              />

              {message && (
                <p className={message.ok ? a.ok : a.error} role="status">
                  {message.text}
                </p>
              )}
            </section>
          ) : (
            <>
              <h1 className={s.title}>{title}</h1>
              <p className={s.address}>{address}</p>

              {facts.length > 0 && (
                <div className={s.facts}>
                  {facts.map(([label, value]) => (
                    <span className={s.fact} key={label}>
                      <span className={s.factValue}>{value}</span>
                      <span className={s.factLabel}>{label}</span>
                    </span>
                  ))}
                </div>
              )}

              {description.trim() === "" ? (
                <p className={s.blank}>{t.properties.noDescription}</p>
              ) : (
                /* Sanitised by lib/sanitize.ts before it was stored. */
                <div className={s.body} dangerouslySetInnerHTML={{ __html: description }} />
              )}

              {message && (
                <p className={message.ok ? a.ok : a.error} role="status">
                  {message.text}
                </p>
              )}
            </>
          )}
        </div>

        {/* The price rides along on a wide screen and sits under the title on a
            phone — the one number somebody scrolls back up for. */}
        <aside className={s.aside}>
          {price && (
            <div className={s.priceCard}>
              <span className={s.price}>{price}</span>
              <span className={s.priceNote}>{t.properties.askingPrice}</span>
            </div>
          )}
          <p className={s.added}>{fill(t.properties.addedOn, { date: added })}</p>
        </aside>
      </div>

      {/* ------------------------------------------------------- photographs */}
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
