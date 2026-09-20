import { redirect } from "next/navigation";
import { DetailsForm } from "@/components/client/DetailsForm";
import { DocumentUpload } from "@/components/client/DocumentUpload";
import { Mono } from "@/components/ui";
import { currentActor } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { clientDocuments, clientSelf } from "@/lib/queries";
import shell from "./portal.module.css";
import s from "./home.module.css";

/*
 * What a client sees after signing in: their own details and the two files we ask
 * for. Everything on this page comes through app.client_self(), which chooses the
 * columns — internal notes and status never leave the database.
 */
export default async function ClientHomePage() {
  const actor = await currentActor();

  if (!actor) redirect("/signin");
  if (actor.kind === "staff") redirect("/admin");

  const [self, documents] = await Promise.all([clientSelf(actor), clientDocuments(actor)]);
  if (!self) redirect("/signin");

  const passport = documents.find((d) => d.kind === "PASSPORT");
  const photo = documents.find((d) => d.kind === "PHOTO");
  const outstanding = documents.filter(
    (d) => d.status === "REQUIRED" || d.status === "REJECTED",
  ).length;

  return (
    <>
      <div className={shell.brandRow}>
        <span className={shell.logo} aria-hidden="true" />
        <span className={shell.wordmark}>{brand.clientName}</span>
      </div>

      <div>
        <h1 className={shell.h1}>Hallo {self.name.split(" ")[0]}</h1>
        <p className={s.summary}>
          {outstanding === 0
            ? "Alles is binnen. Wij hebben op dit moment niets van u nodig."
            : outstanding === 1
              ? "Er ontbreekt nog één bestand. Daarna hebben wij alles."
              : `Er ontbreken nog ${outstanding} bestanden. Daarna hebben wij alles.`}
        </p>
        <Mono size={12.5} color="var(--ink-3)">
          {self.code}
        </Mono>
      </div>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>Wat wij nodig hebben</h2>
        <p className={shell.sectionSub}>
          Een foto met uw telefoon is prima, een scanner hoeft niet. Wij controleren elk bestand met
          de hand, meestal binnen één werkdag.
        </p>

        <div className={s.uploads}>
          <DocumentUpload
            kind="PASSPORT"
            title="Paspoort"
            help="De pagina met uw foto erop. Zorg dat alle vier de hoeken op de foto staan."
            status={passport?.status ?? "REQUIRED"}
            rejectionNote={passport?.rejectionNote ?? null}
            uploadedAt={passport?.uploadedAt?.toISOString() ?? null}
          />
          <DocumentUpload
            kind="PHOTO"
            title="Pasfoto"
            help="Effen witte achtergrond, gezicht volledig zichtbaar, geen bril."
            status={photo?.status ?? "REQUIRED"}
            rejectionNote={photo?.rejectionNote ?? null}
            uploadedAt={photo?.uploadedAt?.toISOString() ?? null}
          />
        </div>
      </section>

      <section className={s.section}>
        <h2 className={shell.sectionTitle}>Uw gegevens</h2>
        <p className={shell.sectionSub}>
          Vul aan wat u weet. U kunt dit later altijd aanpassen.
        </p>
        <DetailsForm
          initial={{
            name: self.name,
            phone: self.phone,
            dateOfBirth: self.date_of_birth,
            nationality: self.nationality,
            passportNumber: self.passport_number,
            passportExpiry: self.passport_expiry,
            addressHomeCountry: self.address_home_country,
            addressSpain: self.address_spain,
          }}
        />
      </section>
    </>
  );
}
