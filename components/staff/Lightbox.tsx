"use client";

import { useCallback, useEffect } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./Lightbox.module.css";

/*
 * One photograph, full size, over everything else.
 *
 * Shared by the property photographs and by a client's passport scans: both are
 * pictures somebody needs to actually look at, and both were stuck at thumbnail size.
 *
 * The caller owns which photo is showing. That keeps this component free of the
 * question "which list am I part of", so a single passport page and a property with
 * nine photographs use the same overlay; with one url the stepping chrome is simply
 * not rendered.
 *
 * Whoever opens it must also render a real link to the image, so that the photo is
 * still reachable when JavaScript is not.
 */
export function Lightbox({
  urls,
  alts,
  at,
  onMove,
  onClose,
}: {
  urls: string[];
  /** Parallel to urls. Falls back to the index if a caller passes too few. */
  alts: string[];
  at: number;
  onMove: (next: number) => void;
  onClose: () => void;
}) {
  const { t } = useCopy();

  const step = useCallback(
    (by: number) => onMove((at + by + urls.length) % urls.length),
    [at, urls.length, onMove],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
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
  }, [onClose, step]);

  const alt = alts[at] ?? String(at + 1);
  const many = urls.length > 1;

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button type="button" className={s.close} onClick={onClose} aria-label={t.common.close}>
        ×
      </button>

      {many && (
        <button
          type="button"
          className={`${s.step} ${s.prev}`}
          aria-label={t.common.previousPhoto}
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
        src={urls[at]}
        alt={alt}
        className={s.full}
        onClick={(event) => event.stopPropagation()}
      />

      {many && (
        <button
          type="button"
          className={`${s.step} ${s.next}`}
          aria-label={t.common.nextPhoto}
          onClick={(event) => {
            event.stopPropagation();
            step(1);
          }}
        >
          ›
        </button>
      )}

      {many && (
        <span className={s.counter}>
          {at + 1} / {urls.length}
        </span>
      )}
    </div>
  );
}
