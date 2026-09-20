import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth/session";
import { publishedSops } from "@/lib/queries";
import shell from "../portal.module.css";
import s from "./uitleg.module.css";

export const metadata = { title: "Uitleg" };

/** The SOPs staff publish. Drafts never reach here — the policy filters them out. */
export default async function UitlegPage() {
  const actor = await currentActor();
  if (!actor) redirect("/signin");
  if (actor.kind === "staff") redirect("/admin");

  const items = await publishedSops(actor);

  return (
    <>
      <div>
        <h1 className={shell.h1}>Uitleg</h1>
        <p className={s.lead}>Hoe de stappen werken, en wat u van ons kunt verwachten.</p>
      </div>

      {items.length === 0 ? (
        <p className={s.empty}>Er staat hier nog niets. Wij vullen dit binnenkort aan.</p>
      ) : (
        <div className={s.list}>
          {items.map((item) => (
            <article key={item.id} className={s.card}>
              <h2 className={s.cardTitle}>{item.title}</h2>
              <p className={s.cardText}>{item.description}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
