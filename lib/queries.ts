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
  property,
  propertyPhoto,
  sop,
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
        status: client.status,
        detailsCompletedAt: client.detailsCompletedAt,
        createdAt: client.createdAt,
        // An invite is only useful before there is an account to sign in with.
        hasAccount: sql<boolean>`exists (
          select 1 from app.client_contact cc
          where cc.client_id = ${client.id} and cc.auth_user_id is not null
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

/* --------------------------------------------------------------------- SOPs */

export async function listSops(actor: Actor) {
  return asActor(actor, (tx) =>
    tx.select().from(sop).orderBy(asc(sop.sortOrder), desc(sop.createdAt)),
  );
}

export async function createSop(
  actor: Actor,
  input: { title: string; description: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .insert(sop)
      .values({
        title: input.title.trim(),
        description: input.description.trim(),
        createdBy: actor.id,
      })
      .returning(),
  );
}

export async function deleteSop(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) => tx.delete(sop).where(eq(sop.id, id)));
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
  input: { title: string; address: string; notes?: string },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [created] = await tx
      .insert(property)
      .values({
        title: input.title.trim(),
        address: input.address.trim(),
        notes: input.notes?.trim() || null,
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

export async function deleteProperty(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) => tx.delete(property).where(eq(property.id, id)));
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
