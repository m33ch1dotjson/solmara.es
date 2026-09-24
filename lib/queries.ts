/*
 * Every read and write the application does.
 *
 * All of it runs through asActor(), so row level security decides what comes back
 * rather than the query hoping it remembered a WHERE clause. A staff query and a
 * client query can therefore look almost identical and still return different rows.
 */

import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { brand, portalUrl } from "@/lib/brand";
import type { Actor } from "@/lib/auth/session";
import { asActor } from "@/lib/db/act";
import { db } from "@/lib/db";
import {
  client,
  clientContact,
  clientDocument,
  clientInvite,
  event,
  processGuide,
  processGuideFile,
  property,
  propertyPhoto,
  staffUser,
  workspaceSetting,
} from "@/lib/db/schema";

/** Invites last two weeks. Long enough to be useful, short enough to expire. */
const INVITE_DAYS = 14;

/* ------------------------------------------------------------------ clients */

export async function listClients(actor: Actor) {
  return asActor(actor, (tx) =>
    tx
      .select({
        id: client.id,
        code: client.code,
        name: client.name,
        email: client.email,
        phone: client.phone,
        companyName: client.companyName,
        city: client.city,
        country: client.country,
        avatarKey: client.avatarKey,
        status: client.status,
        detailsCompletedAt: client.detailsCompletedAt,
        createdAt: client.createdAt,
        // An invite is only useful before there is an account to sign in with.
        hasAccount: sql<boolean>`exists (
          select 1 from app.client_contact cc
          where cc.client_id = ${client.id} and cc.auth_user_id is not null
        )`,
        /* Switched off by an admin. Reported per client rather than per contact:
           the directory asks "can this client get in", not "which of their
           addresses". */
        disabledAt: sql<Date | null>`(
          select cc.disabled_at from app.client_contact cc
          where cc.client_id = ${client.id}
          order by (cc.auth_user_id is null), cc.created_at
          limit 1
        )`,
        /* The most recent invite, so the list can say whether a link is still out
           there, has run out, or was never made. See lib/access.ts. */
        inviteExpiresAt: sql<Date | null>`(
          select i.expires_at from app.client_invite i
          where i.client_id = ${client.id}
          order by i.created_at desc limit 1
        )`,
        inviteUsedAt: sql<Date | null>`(
          select i.used_at from app.client_invite i
          where i.client_id = ${client.id}
          order by i.created_at desc limit 1
        )`,
      })
      .from(client)
      .orderBy(desc(client.createdAt)),
  );
}

export async function getClient(actor: Actor, id: string) {
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(client).where(eq(client.id, id)).limit(1);
    const record = rows[0];
    if (!record) return null;

    const documents = await tx
      .select()
      .from(clientDocument)
      .where(eq(clientDocument.clientId, id));

    const invites = await tx
      .select()
      .from(clientInvite)
      .where(eq(clientInvite.clientId, id))
      .orderBy(desc(clientInvite.createdAt));

    const contacts = await tx
      .select()
      .from(clientContact)
      .where(eq(clientContact.clientId, id));

    const hasAccount = contacts.some((c) => c.authUserId !== null);

    return { record, documents, invites, contacts, hasAccount };
  });
}

/**
 * Creates the client and the two documents we always ask for. The code is built
 * here rather than in the database because the prefix is configuration — a rebrand
 * changes new codes and leaves existing ones alone.
 */
export async function createClient(
  actor: Actor,
  input: { name: string; email: string; locale: "en" | "nl" | "es"; internalNotes?: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  return asActor(actor, async (tx) => {
    const [next] = await tx.execute<{ n: string }>(
      sql`select nextval('app.client_code_seq') as n`,
    );
    const number = Number(next?.n ?? 1);
    const code = `${brand.caseCodePrefix}-C-${String(number).padStart(4, "0")}`;

    const [created] = await tx
      .insert(client)
      .values({
        code,
        codeNumber: number,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        preferredLocale: input.locale,
        internalNotes: input.internalNotes?.trim() || null,
        createdBy: actor.id,
      })
      .returning();

    if (!created) throw new Error("client insert returned nothing");

    await tx.insert(clientDocument).values([
      { clientId: created.id, kind: "PASSPORT" },
      { clientId: created.id, kind: "PHOTO" },
    ]);

    await tx.insert(event).values({
      actorStaffId: actor.id,
      clientId: created.id,
      action: "client.created",
      payload: { code },
    });

    return created;
  });
}

/**
 * A fresh invite link. Any earlier unused invite for this client is expired first,
 * so "generate a new link" means the old one in someone's inbox stops working.
 */
export async function createInvite(actor: Actor, clientId: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  await asActor(actor, async (tx) => {
    await tx
      .update(clientInvite)
      .set({ usedAt: new Date() })
      .where(and(eq(clientInvite.clientId, clientId), sql`${clientInvite.usedAt} is null`));

    await tx.insert(clientInvite).values({
      clientId,
      token,
      createdBy: actor.id,
      expiresAt,
    });

    await tx.insert(event).values({
      actorStaffId: actor.id,
      clientId,
      action: "invite.generated",
      payload: { expiresAt: expiresAt.toISOString() },
    });
  });

  return { url: portalUrl(`/invite/${token}`), expiresAt };
}

/** Approve or reject one document. Only staff may move a status. */
export async function reviewDocument(
  actor: Actor,
  input: { documentId: string; approve: boolean; note?: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(clientDocument)
      .set({
        status: input.approve ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: actor.id,
        rejectionNote: input.approve ? null : (input.note?.trim() ?? null),
      })
      .where(eq(clientDocument.id, input.documentId))
      .returning();

    if (updated) {
      await tx.insert(event).values({
        actorStaffId: actor.id,
        clientId: updated.clientId,
        action: "document.reviewed",
        payload: { kind: updated.kind, status: updated.status },
      });
    }

    return updated;
  });
}

/**
 * Every document a client has actually sent, newest first, with the client it
 * belongs to. Staff only.
 *
 * The join is on app.client, which has no client policy at all — a client running
 * this would get their own document rows back with no client attached, which is why
 * the actor check is here as well as in the policies. Documents still at REQUIRED
 * are left out: they are a promise, not a thing to look at.
 */
export async function listSentDocuments(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  return asActor(actor, (tx) =>
    tx
      .select({
        id: clientDocument.id,
        kind: clientDocument.kind,
        status: clientDocument.status,
        storageKey: clientDocument.storageKey,
        mimeType: clientDocument.mimeType,
        uploadedAt: clientDocument.uploadedAt,
        rejectionNote: clientDocument.rejectionNote,
        clientId: client.id,
        clientName: client.name,
        clientCode: client.code,
      })
      .from(clientDocument)
      .innerJoin(client, eq(client.id, clientDocument.clientId))
      .where(sql`${clientDocument.status} <> 'REQUIRED'`)
      .orderBy(desc(clientDocument.uploadedAt)),
  );
}

/* ------------------------------------------------------- account, team, workspace */

export type NotifySwitches = Record<string, boolean>;

/** The defaults a colleague starts with; the database column carries the same set. */
export const NOTIFY_DEFAULTS: NotifySwitches = {
  email: true,
  clientAdded: true,
  documentUploaded: true,
  taskAssigned: true,
  taskDueSoon: true,
  clientStatusChanged: false,
  noteAdded: false,
};

/** The signed-in colleague's own row, with everything the settings screens edit. */
export async function myStaffProfile(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(staffUser).where(eq(staffUser.id, actor.id)).limit(1);
    return rows[0] ?? null;
  });
}

export async function updateMyProfile(
  actor: Actor,
  input: { name: string; avatarKey?: string | null },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(staffUser)
      .set({
        name: input.name.trim(),
        // Initials follow the name: they are a display detail, not a second thing
        // to keep in step by hand.
        initials: initialsFor(input.name),
        ...(input.avatarKey === undefined ? {} : { avatarKey: input.avatarKey }),
      })
      .where(eq(staffUser.id, actor.id))
      .returning();
    return updated ?? null;
  });
}

export async function updateMyPreferences(
  actor: Actor,
  input: {
    preferredLocale: "en" | "nl" | "es";
    theme: string;
    timeZone: string;
    dateStyle: string;
  },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(staffUser).set(input).where(eq(staffUser.id, actor.id)),
  );
}

export async function updateMyNotifications(actor: Actor, notify: NotifySwitches) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(staffUser).set({ notify }).where(eq(staffUser.id, actor.id)),
  );
}

/** Two letters for an avatar with no picture behind it. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * The billing details a colleague keeps about a client.
 *
 * Separate from what the client fills in themselves: this is the office's own view
 * of who to invoice, and a client editing their profile never touches it.
 */
export async function updateClientBilling(
  actor: Actor,
  id: string,
  input: {
    companyName: string | null;
    phone: string | null;
    postalCode: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    taxId: string | null;
    vatNumber: string | null;
    avatarKey?: string | null;
  },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(client)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(client.id, id))
      .returning({ id: client.id });
    return Boolean(updated);
  });
}

/** Grid or list, for this colleague alone. */
export async function setClientsView(actor: Actor, view: "GRID" | "LIST") {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(staffUser).set({ clientsView: view }).where(eq(staffUser.id, actor.id)),
  );
}

/* ------------------------------------------------------------------- the team */

export async function listTeam(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role,
        active: staffUser.active,
        initials: staffUser.initials,
        avatarKey: staffUser.avatarKey,
        // Null until their first sign-in, which is what "Invited" means on screen.
        authUserId: staffUser.authUserId,
        createdAt: staffUser.createdAt,
      })
      .from(staffUser)
      .orderBy(asc(staffUser.name)),
  );
}

export type StaffRole = (typeof staffUser.role.enumValues)[number];

export async function addTeamMember(
  actor: Actor,
  input: { name: string; email: string; role: StaffRole },
) {
  if (actor.kind !== "staff" || actor.role !== "ADMIN") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(staffUser)
      .values({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        initials: initialsFor(input.name),
        role: input.role,
      })
      .returning();
    if (!created) throw new Error("MEMBER_NOT_CREATED");
    return created;
  });
}

export async function setTeamMemberRole(actor: Actor, id: string, role: StaffRole) {
  if (actor.kind !== "staff" || actor.role !== "ADMIN") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(staffUser).set({ role }).where(eq(staffUser.id, id)),
  );
}

export async function setTeamMemberActive(actor: Actor, id: string, active: boolean) {
  if (actor.kind !== "staff" || actor.role !== "ADMIN") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(staffUser).set({ active }).where(eq(staffUser.id, id)),
  );
}

/* ------------------------------------------------------------------ workspace */

export async function getWorkspace(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(workspaceSetting).limit(1);
    return rows[0] ?? null;
  });
}

export async function updateWorkspace(
  actor: Actor,
  input: {
    companyName: string | null;
    companyEmail: string | null;
    phone: string | null;
    website: string | null;
    displayName: string | null;
    defaultClientLocale: "en" | "nl" | "es";
    defaultCountry: string;
    defaultCurrency: string;
    logoKey?: string | null;

    /* Invoicing. Read only when an invoice is finalised, and copied onto it then. */
    legalName?: string | null;
    taxId?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    accountHolder?: string | null;
    iban?: string | null;
    bic?: string | null;
    bankName?: string | null;
    paymentInstructions?: string | null;
    invoicePrefix?: string;
    paymentTermsDays?: number;
    invoiceLanguage?: "en" | "nl" | "es";
    invoiceNotes?: string | null;
    invoiceLogoKey?: string | null;
  },
) {
  if (actor.kind !== "staff" || actor.role !== "ADMIN") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .update(workspaceSetting)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workspaceSetting.id, true)),
  );
}

/* ------------------------------------------------------------- process guide */

export type GuideCategory = (typeof processGuide.category.enumValues)[number];

export async function listGuides(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select()
      .from(processGuide)
      .orderBy(asc(processGuide.sortOrder), desc(processGuide.updatedAt)),
  );
}

export async function getGuide(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(processGuide).where(eq(processGuide.id, id)).limit(1);
    const record = rows[0];
    if (!record) return null;

    const files = await tx
      .select()
      .from(processGuideFile)
      .where(eq(processGuideFile.guideId, id))
      .orderBy(asc(processGuideFile.createdAt));

    return { record, files };
  });
}

/** Just the row behind a file id, for the route that serves it. */
export async function getGuideFile(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx
      .select()
      .from(processGuideFile)
      .where(eq(processGuideFile.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function createGuide(
  actor: Actor,
  input: { title: string; category?: GuideCategory; content?: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(processGuide)
      .values({
        title: input.title.trim(),
        category: input.category ?? "OTHER",
        content: input.content ?? "",
        createdBy: actor.id,
      })
      .returning();
    if (!created) throw new Error("GUIDE_NOT_CREATED");
    return created;
  });
}

export async function updateGuide(
  actor: Actor,
  id: string,
  input: {
    title: string;
    category: GuideCategory;
    content: string;
    /** undefined leaves the cover alone; null removes it. */
    coverFileId?: string | null;
  },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(processGuide)
      .set({
        title: input.title.trim(),
        category: input.category,
        content: input.content,
        ...(input.coverFileId === undefined ? {} : { coverFileId: input.coverFileId }),
        updatedAt: new Date(),
      })
      .where(eq(processGuide.id, id))
      .returning();
    return updated ?? null;
  });
}

/**
 * A copy of a guide, including its attachments as rows.
 *
 * The files themselves are not copied in storage: both rows point at the same
 * object. Deleting one guide therefore must not delete the object — which is why
 * deleteGuide below only removes storage objects that no other row still refers to.
 */
export async function duplicateGuide(actor: Actor, id: string, titlePrefix: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(processGuide).where(eq(processGuide.id, id)).limit(1);
    const source = rows[0];
    if (!source) return null;

    const [copy] = await tx
      .insert(processGuide)
      .values({
        title: `${titlePrefix} ${source.title}`,
        category: source.category,
        content: source.content,
        createdBy: actor.id,
      })
      .returning();
    if (!copy) throw new Error("GUIDE_NOT_DUPLICATED");

    const files = await tx
      .select()
      .from(processGuideFile)
      .where(eq(processGuideFile.guideId, id));

    if (files.length > 0) {
      await tx.insert(processGuideFile).values(
        files.map((file) => ({
          guideId: copy.id,
          kind: file.kind,
          filename: file.filename,
          storageKey: file.storageKey,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedBy: actor.id,
        })),
      );
    }

    return copy;
  });
}

/**
 * Deletes a guide and returns the storage keys that nothing else points at, so the
 * caller can clear them. A duplicated guide shares its files with the original;
 * deleting the copy must not empty the original's attachments.
 */
export async function deleteGuide(actor: Actor, id: string): Promise<string[]> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const mine = await tx
      .select()
      .from(processGuideFile)
      .where(eq(processGuideFile.guideId, id));

    // The cascade removes the file rows with the guide.
    await tx.delete(processGuide).where(eq(processGuide.id, id));

    if (mine.length === 0) return [];

    const stillUsed = await tx
      .select({ storageKey: processGuideFile.storageKey })
      .from(processGuideFile);
    const used = new Set(stillUsed.map((row) => row.storageKey));

    return mine.map((file) => file.storageKey).filter((key) => !used.has(key));
  });
}

/** Points a guide at one of its own files as the cover, or clears it. */
export async function setGuideCover(actor: Actor, guideId: string, fileId: string | null) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .update(processGuide)
      .set({ coverFileId: fileId, updatedAt: new Date() })
      .where(eq(processGuide.id, guideId)),
  );
}

export async function addGuideFile(
  actor: Actor,
  input: {
    guideId: string;
    kind: "IMAGE" | "ATTACHMENT";
    filename: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(processGuideFile)
      .values({ ...input, uploadedBy: actor.id })
      .returning();
    if (!created) throw new Error("FILE_NOT_RECORDED");
    return created;
  });
}

/** Removes one file row, and reports whether its object is now unreferenced. */
export async function removeGuideFile(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [deleted] = await tx
      .delete(processGuideFile)
      .where(eq(processGuideFile.id, id))
      .returning();
    if (!deleted) return null;

    const others = await tx
      .select({ id: processGuideFile.id })
      .from(processGuideFile)
      .where(eq(processGuideFile.storageKey, deleted.storageKey))
      .limit(1);

    return { ...deleted, orphaned: others.length === 0 };
  });
}

/* --------------------------------------------------------------- properties */

export async function listProperties(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(property).orderBy(desc(property.createdAt));
    const photos = await tx
      .select()
      .from(propertyPhoto)
      .orderBy(asc(propertyPhoto.sortOrder));
    return rows.map((row) => ({
      ...row,
      photos: photos.filter((p) => p.propertyId === row.id),
    }));
  });
}

export async function createProperty(
  actor: Actor,
  input: { title: string; address: string; description?: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(property)
      .values({
        title: input.title.trim(),
        address: input.address.trim(),
        description: input.description ?? "",
        createdBy: actor.id,
      })
      .returning();
    return created;
  });
}

export async function addPropertyPhoto(
  actor: Actor,
  input: { propertyId: string; storageKey: string; mimeType: string; sizeBytes: number },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.insert(propertyPhoto).values({
      propertyId: input.propertyId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    }),
  );
}

export async function getProperty(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(property).where(eq(property.id, id)).limit(1);
    const record = rows[0];
    if (!record) return null;

    const photos = await tx
      .select()
      .from(propertyPhoto)
      .where(eq(propertyPhoto.propertyId, id))
      .orderBy(asc(propertyPhoto.sortOrder), asc(propertyPhoto.createdAt));

    return { record, photos };
  });
}

export async function updateProperty(
  actor: Actor,
  id: string,
  input: {
    title: string;
    address: string;
    /** HTML, already sanitised by the caller. */
    description: string;
    priceCents: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
  },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(property)
      .set({
        title: input.title.trim(),
        address: input.address.trim(),
        description: input.description,
        priceCents: input.priceCents,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        areaM2: input.areaM2,
      })
      .where(eq(property.id, id))
      .returning();
    return updated ?? null;
  });
}

/** Removes one photograph and hands back its storage key, so the object goes too. */
export async function deletePropertyPhoto(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [deleted] = await tx
      .delete(propertyPhoto)
      .where(eq(propertyPhoto.id, id))
      .returning();
    return deleted ?? null;
  });
}

/**
 * Deletes a property and returns the storage keys that went with it.
 *
 * The rows cascade; the objects in the bucket do not. Before this, deleting a
 * property left its photographs in storage forever — invisible, paid for, and still
 * holding whatever was in them.
 */
export async function deleteProperty(actor: Actor, id: string): Promise<string[]> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const photos = await tx
      .select({ storageKey: propertyPhoto.storageKey })
      .from(propertyPhoto)
      .where(eq(propertyPhoto.propertyId, id));

    await tx.delete(property).where(eq(property.id, id));
    return photos.map((photo) => photo.storageKey);
  });
}

/* ----------------------------------------------------------- the client side */

/** The signed-in client's own details, through the function that filters columns. */
export async function clientSelf(actor: Actor) {
  if (actor.kind !== "client") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.execute<{
      id: string;
      code: string;
      name: string;
      email: string;
      phone: string | null;
      date_of_birth: string | null;
      nationality: string | null;
      passport_number: string | null;
      passport_expiry: string | null;
      address_home_country: string | null;
      address_spain: string | null;
      details_completed_at: string | null;
    }>(sql`select * from app.client_self()`);
    return rows[0] ?? null;
  });
}

export async function clientDocuments(actor: Actor) {
  if (actor.kind !== "client") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.select().from(clientDocument).where(eq(clientDocument.clientId, actor.clientId)),
  );
}

/** Column list lives in the database function, so a stray form field cannot land. */
export async function updateClientSelf(
  actor: Actor,
  input: {
    name: string;
    phone: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    passportNumber: string | null;
    passportExpiry: string | null;
    addressHomeCountry: string | null;
    addressSpain: string | null;
  },
) {
  if (actor.kind !== "client") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    await tx.execute(sql`
      select app.client_update_self(
        ${input.name}, ${input.phone},
        ${input.dateOfBirth}::date, ${input.nationality},
        ${input.passportNumber}, ${input.passportExpiry}::date,
        ${input.addressHomeCountry}, ${input.addressSpain}
      )
    `);
    await tx.insert(event).values({
      actorContactId: actor.id,
      clientId: actor.clientId,
      action: "client.details_updated",
      payload: {},
    });
  });
}

/** Invite lookup runs without a session, so it goes through the definer function. */
export async function lookupInvite(token: string) {
  const rows = await db.execute<{
    client_id: string;
    client_name: string;
    email: string;
    valid: boolean;
  }>(sql`select * from app.invite_lookup(${token})`);
  return rows[0] ?? null;
}
