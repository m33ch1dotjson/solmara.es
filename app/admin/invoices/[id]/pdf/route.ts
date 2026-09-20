import { NextResponse } from "next/server";
import { currentActor } from "@/lib/auth/session";
import { getInvoice } from "@/lib/invoices";
import { BUCKET_INVOICES, signedUrl } from "@/lib/storage";

/*
 * The invoice PDF.
 *
 * Staff only, checked here — the bucket is private and has no storage policies, so
 * this route is the only way to the file, and guessing an invoice id gets a 404
 * rather than somebody else's financial records.
 *
 * A redirect to a ten-minute signed URL rather than a proxy: the bytes go straight
 * from storage to the browser, and a link copied out of the address bar is dead
 * before it reaches anybody.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (actor?.kind !== "staff") return new NextResponse(null, { status: 404 });

  const { id } = await context.params;
  const found = await getInvoice(actor, id);
  if (!found?.record.pdfStorageKey) return new NextResponse(null, { status: 404 });

  const url = await signedUrl(BUCKET_INVOICES, found.record.pdfStorageKey);
  if (!url) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=30" } });
}
