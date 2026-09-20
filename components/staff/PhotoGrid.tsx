"use client";

import { useState } from "react";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import { Lightbox } from "./Lightbox";
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

  const alts = urls.map((_, i) => fill(t.properties.photoAlt, { title, n: i + 1 }));

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
            title={t.common.enlarge}
            onClick={(event) => {
              // Let a middle click, a modified click or a right click do what the
              // browser would normally do with a link.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setOpen(i);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alts[i]} className={s.thumb} />
          </a>
        ))}
      </div>

      {open !== null && (
        <Lightbox
          urls={urls}
          alts={alts}
          at={open}
          onMove={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
