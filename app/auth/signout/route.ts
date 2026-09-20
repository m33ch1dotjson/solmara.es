import { NextResponse } from "next/server";
import { serverClient } from "@/lib/auth/supabase";

/** POST only: a sign-out on GET can be triggered by a stray image tag. */
export async function POST(request: Request) {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", request.url), { status: 303 });
}
