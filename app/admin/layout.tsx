import type { Metadata } from "next";
import { StaffNav } from "@/components/staff/StaffNav";
import { brand } from "@/lib/brand";
import { signedInUser } from "@/lib/mock";
import s from "./staff.module.css";

/*
 * The staff shell: a fixed 232px nav beside a fluid main column.
 *
 * `themeStaff` selects the staff neutral hue (95). The client portal uses its own
 * slightly warmer scale, which is why the two are separate classes rather than one
 * set of tokens on :root.
 */
export const metadata: Metadata = {
  title: { default: brand.staffName, template: `%s · ${brand.staffName}` },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`themeStaff ${s.shell}`}>
      <StaffNav user={signedInUser} brandName={brand.staffName} />
      <main className={s.main}>{children}</main>
    </div>
  );
}
