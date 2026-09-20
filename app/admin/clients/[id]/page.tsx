import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientInvoices } from "@/components/staff/ClientInvoices";
import { DocumentReview } from "@/components/staff/DocumentReview";
import { InviteButton } from "@/components/staff/InviteButton";
import { Mono, StatusPill } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { displayStatus, listClientInvoices } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { getClient } from "@/lib/queries";
import { BUCKET_CLIENT_DOCUMENTS, signedUrl } from "@/lib/storage";
import shell from "../../staff.module.css";
import s from "./client.module.css";

/*
 * Everything about one client on one screen: what they filled in, what they sent,
 * and the internal note nobody outside this page ever sees.
 */

const PILL_STATUS = {
  INVITED: "required",
  ACTIVE: "approved",
  CLOSED: "waived",
} as const;

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const { id } = await params;
  const found = await getClient(actor, id);
  if (!found) notFound();

  const t = copy(locale);
  const { record, documents, invites, hasAccount } = found;
  const invoices = await listClientInvoices(actor, id);

  function show(value: string | Date | null): string {
    if (!value) return t.common.blank;
    return value instanceof Date ? formatDateFor(value, locale, dates) : value;
  }

  // Signed per render, ten minutes. Downloads are logged by the storage layer.
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      url: doc.storageKey ? await signedUrl(BUCKET_CLIENT_DOCUMENTS, doc.storageKey) : null,
    })),
  );

  const facts: Array<[string, string]> = [
    [t.common.email, show(record.email)],
    [t.fields.phone, show(record.phone)],
    [t.fields.dateOfBirth, show(record.dateOfBirth)],
    [t.fields.nationality, show(record.nationality)],
    [t.fields.passportNumber, show(record.passportNumber)],
    [t.fields.passportExpiry, show(record.passportExpiry)],
    [t.fields.addressHomeCountry, show(record.addressHomeCountry)],
    [t.fields.addressSpain, show(record.addressSpain)],
  ];

  const docTitle = { PASSPORT: t.documents.passportTitle, PHOTO: t.documents.photoTitle };
  const lastInvite = invites[0];

  return (
    <div className={shell.screen}>
      <Link href="/admin/clients" className={s.back}>
        {t.clientDetail.back}
      </Link>

      <div className={s.head}>
        <div>
          <h1 className={shell.pageTitle}>{record.name}</h1>
          <div className={s.meta}>
            <Mono size={13} color="var(--ink-3)">
              {record.code}
            </Mono>
            <span className={s.sep}>·</span>
            <StatusPill
              status={PILL_STATUS[record.status]}
              audience="staff"
              locale={locale}
              labelOverride={
                record.status === "INVITED"
                  ? t.clients.statusInvited
                  : record.status === "ACTIVE"
                    ? t.clients.statusActive
                    : t.clients.statusClosed
              }
            />
            <span className={s.sep}>·</span>
            <span>
              {record.detailsCompletedAt
                ? fill(t.clientDetail.detailsFilledOn, {
                    date: show(record.detailsCompletedAt),
                  })
                : t.clientDetail.detailsNotFilled}
            </span>
          </div>
        </div>
        {hasAccount ? (
          <span className={s.quiet}>{t.clients.hasAccount}</span>
        ) : (
          <InviteButton clientId={record.id} clientName={record.name} />
        )}
      </div>

      <h2 className={s.sectionTitle}>{t.clientDetail.sectionDetails}</h2>
      <dl className={s.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={s.fact}>
            <dt className={s.factLabel}>{label}</dt>
            <dd className={s.factValue}>{value}</dd>
          </div>
        ))}
      </dl>

      {record.internalNotes && (
        <>
          <h2 className={s.sectionTitle}>{t.clientDetail.sectionNote}</h2>
          <p className={s.note}>{record.internalNotes}</p>
        </>
      )}

      <h2 className={s.sectionTitle}>{t.clientDetail.sectionDocuments}</h2>
      <div className={s.documents}>
        {withUrls.map((doc) => (
          <DocumentReview
            key={doc.id}
            documentId={doc.id}
            title={docTitle[doc.kind]}
            status={doc.status}
            url={doc.url}
            mimeType={doc.mimeType}
            uploadedAt={doc.uploadedAt?.toISOString() ?? null}
            rejectionNote={doc.rejectionNote}
          />
        ))}
      </div>

      <h2 className={s.sectionTitle}>{t.invoices.clientSection}</h2>
      <ClientInvoices
        clientId={record.id}
        rows={invoices.map((row) => ({
          id: row.id,
          number: row.number,
          amount: formatMoney(row.totalCents, locale, row.currency),
          issued: formatDateFor(row.issueDate, locale, dates),
          status: displayStatus(row.status, row.dueDate),
        }))}
      />

      {lastInvite && !hasAccount && (
        <p className={s.inviteMeta}>
          {lastInvite.usedAt
            ? fill(t.clientDetail.lastLinkUsed, { date: show(lastInvite.createdAt) })
            : fill(t.clientDetail.lastLinkValid, {
                date: show(lastInvite.createdAt),
                until: show(lastInvite.expiresAt),
              })}
        </p>
      )}
    </div>
  );
}
