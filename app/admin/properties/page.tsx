import { DeleteButton } from "@/components/staff/DeleteButton";
import { PropertyForm } from "@/components/staff/PropertyForm";
import { Mono } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { listProperties } from "@/lib/queries";
import { BUCKET_PROPERTY_PHOTOS, signedUrl } from "@/lib/storage";
import { deletePropertyAction } from "../actions";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export const metadata = { title: "Properties" };

export default async function PropertiesPage() {
  const actor = await staffOrRedirect();
  const properties = await listProperties(actor);

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
        <h1 className={shell.pageTitle}>Properties</h1>
      </div>
      <p className={shell.pageLead}>
        Interessante woningen, alleen voor het team. Klanten zien deze lijst niet — er is geen
        enkele route waarlangs ze erbij kunnen.
      </p>

      <PropertyForm />

      <h2 className={s.sectionTitle}>
        {withUrls.length} {withUrls.length === 1 ? "property" : "properties"}
      </h2>

      {withUrls.length === 0 ? (
        <p className={s.empty}>Nog niets. Voeg hierboven de eerste toe.</p>
      ) : (
        <div className={s.cardList}>
          {withUrls.map((item) => (
            <div key={item.id} className={s.card}>
              <div className={s.cardBody}>
                <div className={s.cardTitle}>{item.title}</div>
                <p className={s.cardText}>{item.address}</p>
                {item.notes && <p className={s.cardText}>{item.notes}</p>}

                {item.photoUrls.length > 0 && (
                  <div className={s.thumbs}>
                    {item.photoUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt={`${item.title}, foto ${i + 1}`}
                        className={s.thumb}
                      />
                    ))}
                  </div>
                )}

                <div className={s.cardMeta}>
                  <Mono size={11.5}>{item.photos.length}</Mono>{" "}
                  {item.photos.length === 1 ? "foto" : "foto&apos;s"} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className={s.cardActions}>
                <DeleteButton id={item.id} action={deletePropertyAction} label="Verwijderen" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
