import { ClientNav } from "@/components/client/ClientNav";
import { currentActor } from "@/lib/auth/session";
import s from "./portal.module.css";

/*
 * The client shell: one centred column, phone first.
 *
 * `themeClient` selects the slightly warmer neutral scale. The nav only appears once
 * somebody is signed in — there is nothing to navigate to before that.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();

  return (
    <div className={`themeClient ${s.shell}`}>
      <div className={s.column}>
        {children}
        {actor?.kind === "client" && <ClientNav />}
      </div>
    </div>
  );
}
