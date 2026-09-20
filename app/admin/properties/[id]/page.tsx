import { notFound } from "next/navigation";
import { PropertyDetail } from "@/components/staff/PropertyDetail";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { getProperty } from "@/lib/queries";
import { BUCKET_PROPERTY_PHOTOS, signedUrl } from "@/lib/storage";

/*
 * One property: its photographs full size, its details editable in place, and the
 * delete that used to sit on the list — where a misplaced click on a dense grid is
 * easy — behind two steps here instead.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const { id } = await params;
  const found = await getProperty(actor, id);
  return { title: found?.record.title ?? copy(locale).properties.title };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const { id } = await params;

  const found = await getProperty(actor, id);
  if (!found) notFound();

  const { record, photos } = found;

  const withUrls = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      url: await signedUrl(BUCKET_PROPERTY_PHOTOS, photo.storageKey),
    })),
  );

  return (
    <PropertyDetail
      id={record.id}
      title={record.title}
      address={record.address}
      notes={record.notes ?? ""}
      added={formatDateFor(record.createdAt, locale, dates)}
      photos={withUrls.filter((photo): photo is { id: string; url: string } => photo.url !== null)}
    />
  );
}
