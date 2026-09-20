import { ClientHeader } from "@/components/client/ClientHeader";
import { currentActor } from "@/lib/auth/session";
import s from "./portal.module.css";

/*
 * The client shell: one centred column, phone first, growing on a wider screen.
 *
 * The header only appears once somebody is signed in — on the sign-in screen there
 * is nothing to sign out of.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();

  return (
    <div className={`themeClient ${s.shell}`}>
      <div className={s.column}>
        {actor?.kind === "client" && <ClientHeader name={actor.name} />}
        {children}
      </div>
    </div>
  );
}
