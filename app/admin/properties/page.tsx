import Link from "next/link";
import { AddPropertyButton } from "@/components/staff/AddPropertyButton";
import { Mono } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { listProperties } from "@/lib/queries";
import { BUCKET_PROPERTY_PHOTOS, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";
import s from "./properties.module.css";

/*
 * Browsing comes first.
 *
 * This page used to open with the whole Add Property form, which pushed the
 * listings below the fold — the thing you came for was the thing you had to scroll
 * past a form to reach. Adding is a button now, and the listings are the page.
 *
 * Only the first photograph of each property is signed here. A hundred properties
 * with nine photographs each is nine hundred signing round trips for pictures
 * nobody is looking at yet; the rest are signed on the property's own page.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).properties.title };
}

export default async function PropertiesPage() {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const properties = await listProperties(actor);
  const t = copy(locale);

  const cards = await Promise.all(
    properties.map(async (item) => ({
      ...item,
      coverUrl: item.photos[0]
        ? await signedUrl(BUCKET_PROPERTY_PHOTOS, item.photos[0].storageKey)
        : null,
    })),
  );

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.properties.title}</h1>
        <AddPropertyButton />
      </div>
      <p className={shell.pageLead}>{t.properties.lead}</p>

      <h2 className={s.count}>
        {fill(cards.length === 1 ? t.properties.countOne : t.properties.countMany, {
          n: cards.length,
        })}
      </h2>

      {cards.length === 0 ? (
        <p className={s.empty}>{t.properties.emptyNow}</p>
      ) : (
        <div className={s.grid}>
          {cards.map((item) => (
            <Link key={item.id} href={`/admin/properties/${item.id}`} className={s.card}>
              <span className={s.cover}>
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt="" className={s.coverImage} />
                ) : (
                  <span className={s.coverBlank} aria-hidden="true">
                    ⌂
                  </span>
                )}
                {item.photos.length > 1 && (
                  <span className={s.photoBadge}>
                    <Mono size={11}>{item.photos.length}</Mono>
                  </span>
                )}
              </span>

              <span className={s.body}>
                <span className={s.title}>{item.title}</span>
                <span className={s.address}>{item.address}</span>
                {item.notes && <span className={s.note}>{item.notes}</span>}
              </span>

              <span className={s.foot}>{formatDateFor(item.createdAt, locale, dates)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
