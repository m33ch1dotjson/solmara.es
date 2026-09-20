import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/staff/AdminTabs";
import { currentActor } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import s from "./staff.module.css";

export const metadata: Metadata = {
  title: { default: brand.staffName, template: `%s · ${brand.staffName}` },
};

/*
 * Every admin screen sits behind this. The check is in the layout rather than in
 * each page, so a new page added later is protected by default instead of by
 * remembering.
 *
 * Someone signed in with an address that is in neither staff_user nor
 * client_contact gets no actor at all, and is sent back to sign in.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();

  if (!actor) redirect("/signin?next=/admin");
  if (actor.kind !== "staff") redirect("/");

  return (
    <div className={`themeStaff ${s.shell}`}>
      <AdminTabs brandName={brand.staffName} user={actor.name} />
      <main className={s.main}>{children}</main>
    </div>
  );
}
