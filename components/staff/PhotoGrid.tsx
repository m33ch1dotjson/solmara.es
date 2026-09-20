"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import s from "./PhotoGrid.module.css";

/*
 * The photographs of one property: thumbnails that open full size.
 *
 * The thumbnail is an ordinary link to the image, and the click is only intercepted
 * once React is running. Without JavaScript the photo still opens, in a new tab —
 * the same choice the language switcher makes.
 *
 * The href is a signed URL that expires ten minutes after the page was rendered, so
 * a tab left open overnight will 400 rather than keep serving the image. Reloading
 * the page mints a fresh one.
 */
export function PhotoGrid({ title, urls }: { title: string; urls: string[] }) {
  const { t } = useCopy();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (by: number) => setOpen((at) => (at === null ? null : (at + by + urls.length) % urls.length)),
    [urls.length],
  );

  useEffect(() => {
    if (open === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }

    // The page behind the overlay must not scroll along with it, on a phone least
    // of all, where the overlay covers everything and the scroll goes unseen.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const alt = (i: number) => fill(t.properties.photoAlt, { title, n: i + 1 });

  return (
    <>
      <div className={s.thumbs}>
        {urls.map((url, i) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={s.thumbLink}
            title={t.properties.enlarge}
            onClick={(event) => {
              // Let a middle click, a modified click or a right click do what the
              // browser would normally do with a link.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setOpen(i);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt(i)} className={s.thumb} />
          </a>
        ))}
      </div>

      {open !== null && (
        <div
          className={s.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={alt(open)}
          onClick={close}
        >
          <button type="button" className={s.close} onClick={close} aria-label={t.common.close}>
            ×
          </button>

          {urls.length > 1 && (
            <button
              type="button"
              className={`${s.step} ${s.prev}`}
              aria-label={t.properties.previousPhoto}
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[open]}
            alt={alt(open)}
            className={s.full}
            onClick={(event) => event.stopPropagation()}
          />

          {urls.length > 1 && (
            <button
              type="button"
              className={`${s.step} ${s.next}`}
              aria-label={t.properties.nextPhoto}
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
            >
              ›
            </button>
          )}

          {urls.length > 1 && (
            <span className={s.counter}>
              {open + 1} / {urls.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
