import { ClientNav } from "@/components/client/ClientNav";
import { LocaleProvider } from "@/components/client/LocaleProvider";
import { featuredClient } from "@/lib/mock";
import s from "./portal.module.css";

/*
 * The client portal shell.
 *
 * A single centred column, 452px wide, designed phone-first and simply centred on
 * desktop. `themeClient` selects the slightly warmer neutral hue (85).
 *
 * Assume an older Android in bad light: high contrast, nothing interactive below
 * 44px, and no information that depends on hover.
 *
 * The language comes from the client's stored preference. The design file's top bar
 * with screen and theme switches was a preview harness and is deliberately absent.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`themeClient ${s.shell}`}>
      <LocaleProvider initial={featuredClient.locale}>
        <div className={s.column}>
          {children}
          <ClientNav />
        </div>
      </LocaleProvider>
    </div>
  );
}
