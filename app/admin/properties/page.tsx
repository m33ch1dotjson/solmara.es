import { DeleteButton } from "@/components/staff/DeleteButton";
import { LongText } from "@/components/staff/LongText";
import { PhotoGrid } from "@/components/staff/PhotoGrid";
import { PropertyForm } from "@/components/staff/PropertyForm";
import { Mono } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { listProperties } from "@/lib/queries";
import { BUCKET_PROPERTY_PHOTOS, signedUrl } from "@/lib/storage";
import { deletePropertyAction } from "../actions";
import shell from "../staff.module.css";
import s from "../admin.module.css";

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

  // Signed URLs are minted per render and expire in ten minutes. Nothing here is
  // a public object, so a screenshot of the page is not a permanent link.
  const withUrls = await Promise.all(
    properties.map(async (item) => ({
      ...item,
      photoUrls: (
        await Promise.all(
          item.photos.map((photo) => signedUrl(BUCKET_PROPERTY_PHOTOS, photo.storageKey)),
        )
      ).filter((url): url is string => url !== null),
    })),
  );

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.properties.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.properties.lead}</p>

      <PropertyForm />

      <h2 className={s.sectionTitle}>
        {fill(withUrls.length === 1 ? t.properties.countOne : t.properties.countMany, {
          n: withUrls.length,
        })}
      </h2>

      {withUrls.length === 0 ? (
        <p className={s.empty}>{t.properties.empty}</p>
      ) : (
        <div className={s.cardList}>
          {withUrls.map((item) => (
            <div key={item.id} className={s.card}>
              <div className={s.cardBody}>
                <div className={s.cardTitle}>{item.title}</div>
                <p className={s.cardText}>{item.address}</p>
                {item.notes && (
                  <LongText
                    text={item.notes}
                    className={s.cardText}
                    more={t.common.showMore}
                    less={t.common.showLess}
                  />
                )}

                {item.photoUrls.length > 0 && (
                  <PhotoGrid title={item.title} urls={item.photoUrls} />
                )}

                <div className={s.cardMeta}>
                  <Mono size={11.5}>{item.photos.length}</Mono>{" "}
                  {item.photos.length === 1 ? t.properties.photoOne : t.properties.photoMany} ·{" "}
                  {formatDateFor(item.createdAt, locale, dates)}
                </div>
              </div>
              <div className={s.cardActions}>
                <DeleteButton id={item.id} action={deletePropertyAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
