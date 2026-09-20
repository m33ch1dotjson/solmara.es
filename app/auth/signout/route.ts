import { NextResponse } from "next/server";
import { serverClient } from "@/lib/auth/supabase";
import { publicUrl } from "@/lib/public-url";

/** POST only: a sign-out on GET can be triggered by a stray image tag. */
export async function POST(request: Request) {
  const supabase = await serverClient();
  await supabase.auth.signOut();

  // Built from the forwarded host, not request.url: behind the tunnel that would be
  // https://0.0.0.0:3000, which no browser can resolve.
  return NextResponse.redirect(publicUrl(request.headers, "/signin"), { status: 303 });
}
