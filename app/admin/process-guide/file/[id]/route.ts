import { NextResponse } from "next/server";
import { currentActor } from "@/lib/auth/session";
import { getGuideFile } from "@/lib/queries";
import { BUCKET_GUIDE_FILES, signedUrl } from "@/lib/storage";

/*
 * Serves one file belonging to a Process Guide.
 *
 * This exists so that a document body can hold a stable address. Signed URLs live
 * ten minutes; a guide lives years. So the HTML says /admin/process-guide/file/<id>,
 * and this route checks the reader is staff and then redirects to a URL minted just
 * now. The bucket stays private and unaddressable, exactly like the other two.
 *
 * A redirect rather than a proxy: the bytes go straight from storage to the browser,
 * so a 9 MB attachment does not travel through the Node process twice.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (actor?.kind !== "staff") {
    // 404, not 403: whether a given id exists is not something to confirm to
    // somebody who has no business here.
    return new NextResponse(null, { status: 404 });
  }

  const { id } = await context.params;
  const file = await getGuideFile(actor, id);
  if (!file) return new NextResponse(null, { status: 404 });

  const url = await signedUrl(BUCKET_GUIDE_FILES, file.storageKey);
  if (!url) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(url, {
    // The signed URL is good for ten minutes; let the browser cache the redirect for
    // a fraction of that, so a page full of screenshots is not a page full of
    // round trips, and a stale one still resolves.
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
