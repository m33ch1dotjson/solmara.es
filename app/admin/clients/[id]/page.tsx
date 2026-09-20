import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentReview } from "@/components/staff/DocumentReview";
import { InviteButton } from "@/components/staff/InviteButton";
import { Mono, StatusPill } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { getClient } from "@/lib/queries";
import { BUCKET_CLIENT_DOCUMENTS, signedUrl } from "@/lib/storage";
import shell from "../../staff.module.css";
import s from "./client.module.css";

/*
 * Everything about one client on one screen: what they filled in, what they sent,
 * and the internal note nobody outside this page ever sees.
 */

const STATUS_PILL = {
  INVITED: { status: "required" as const, label: "Uitgenodigd" },
  ACTIVE: { status: "approved" as const, label: "Actief" },
  CLOSED: { status: "waived" as const, label: "Afgesloten" },
};

const DOC_TITLE = { PASSPORT: "Paspoort", PHOTO: "Pasfoto" } as const;

function show(value: string | Date | null): string {
  if (!value) return "—";
  if (value instanceof Date) {
    return value.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  }
  return value;
}

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await staffOrRedirect();
  const { id } = await params;
  const found = await getClient(actor, id);
  if (!found) notFound();

  const { record, documents, invites } = found;
  const pill = STATUS_PILL[record.status];

  // Signed per render, ten minutes. Downloads are logged by the storage layer.
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      url: doc.storageKey ? await signedUrl(BUCKET_CLIENT_DOCUMENTS, doc.storageKey) : null,
    })),
  );

  const facts: Array<[string, string]> = [
    ["E-mailadres", show(record.email)],
    ["Telefoonnummer", show(record.phone)],
    ["Geboortedatum", show(record.dateOfBirth)],
    ["Nationaliteit", show(record.nationality)],
    ["Paspoortnummer", show(record.passportNumber)],
    ["Paspoort geldig tot", show(record.passportExpiry)],
    ["Adres eigen land", show(record.addressHomeCountry)],
    ["Adres in Spanje", show(record.addressSpain)],
  ];

  const lastInvite = invites[0];

  return (
    <div className={shell.screen}>
      <Link href="/admin" className={s.back}>
        ‹ Alle klanten
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
              status={pill.status}
              audience="staff"
              locale={brand.defaultLocale}
              labelOverride={pill.label}
            />
            <span className={s.sep}>·</span>
            <span>
              {record.detailsCompletedAt
                ? `Gegevens ingevuld op ${show(record.detailsCompletedAt)}`
                : "Gegevens nog niet ingevuld"}
            </span>
          </div>
        </div>
        <InviteButton clientId={record.id} clientName={record.name} />
      </div>

      <h2 className={s.sectionTitle}>Gegevens</h2>
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
          <h2 className={s.sectionTitle}>Interne notitie</h2>
          <p className={s.note}>{record.internalNotes}</p>
        </>
      )}

      <h2 className={s.sectionTitle}>Documenten</h2>
      <div className={s.documents}>
        {withUrls.map((doc) => (
          <DocumentReview
            key={doc.id}
            documentId={doc.id}
            title={DOC_TITLE[doc.kind]}
            status={doc.status}
            url={doc.url}
            mimeType={doc.mimeType}
            uploadedAt={doc.uploadedAt?.toISOString() ?? null}
            rejectionNote={doc.rejectionNote}
          />
        ))}
      </div>

      {lastInvite && (
        <p className={s.inviteMeta}>
          Laatste link aangemaakt op {show(lastInvite.createdAt)},{" "}
          {lastInvite.usedAt ? "inmiddels gebruikt" : `geldig tot ${show(lastInvite.expiresAt)}`}.
        </p>
      )}
    </div>
  );
}
