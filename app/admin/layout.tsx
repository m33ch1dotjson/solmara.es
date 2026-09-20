import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/staff/AdminTabs";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { currentActor } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import s from "./staff.module.css";

export const metadata: Metadata = {
  title: { default: brand.staffName, template: `%s · ${brand.staffName}` },
};

/*
 * Every admin screen sits behind this. The check lives in the layout rather than in
 * each page, so a page added later is protected by default instead of by someone
 * remembering.
 *
 * A signed-out visitor gets the staff sign-in here, on /admin itself — no bounce to
 * the client portal's door. A signed-in client gets sent to their own side, because
 * this is not their building.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();

  if (!actor) {
    /*
     * The theme class, but not the shell: above 900px the shell is a two-column grid
     * whose first column is the 240px navigation. With only the sign-in card inside
     * it, the card landed in that 240px column — squeezed against the left edge of a
     * desktop screen instead of centred. The card brings its own full-height, centred
     * screen.
     */
    return (
      <div className="themeStaff">
        <StaffLogin brandName={brand.staffName} />
      </div>
    );
  }

  if (actor.kind !== "staff") redirect("/");

  return (
    <div className={`themeStaff ${s.shell}`}>
      <AdminTabs brandName={brand.staffName} user={actor.name} />
      <main className={s.main}>{children}</main>
    </div>
  );
}
