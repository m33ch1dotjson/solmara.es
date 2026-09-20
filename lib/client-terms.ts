/*
 * Client-facing vocabulary that Solmara overrides.
 *
 * The design handoff calls a case a "Case" / "Dossier" / "Expediente". Solmara asked
 * for service wording instead: a client does not think of themselves as having a
 * case file, they think they asked us to arrange their NIE. Internally the entity
 * stays `case` — only the word the client reads changes.
 *
 * This file exists rather than editing lib/mock/client-copy.json because that file is
 * extracted from the design and gets overwritten whenever the design changes. An
 * override belongs somewhere it survives, and somewhere a reader can see that it is
 * a deliberate departure.
 */

import type { Locale } from "./brand";

export interface ClientTerms {
  /** Nav and page title for the list of things we are doing for them. */
  services: string;
  /** Eyebrow above one service, replacing "Case". */
  serviceKicker: string;
  /** Back link to the list. */
  backToServices: string;
  documents: string;
  documentsLead: string;
  profile: string;
  profileLead: string;
  home: string;
  /** Empty state for the vault. */
  documentsEmpty: string;
  download: string;
  usedFor: string;
  /** Section headings on the profile screen. */
  profilePersonal: string;
  profileIdentification: string;
  profileContact: string;
  profileAddress: string;
  profileCorrect: string;
  notKnownYet: string;
}

export const CLIENT_TERMS: Record<Locale, ClientTerms> = {
  en: {
    services: "My services",
    serviceKicker: "Service",
    backToServices: "All my services",
    documents: "My documents",
    documentsLead:
      "Everything we have checked and accepted. Open any of them again whenever you need it — at the bank, at the notary, or years from now.",
    profile: "My details",
    profileLead:
      "What we hold about you. If something is wrong, tell us and we will correct it.",
    home: "Home",
    documentsEmpty:
      "Nothing here yet. Documents appear once we have checked them, and stay available to you.",
    download: "Download",
    usedFor: "Used for",
    profilePersonal: "About you",
    profileIdentification: "Your numbers",
    profileContact: "How we reach you",
    profileAddress: "Addresses",
    profileCorrect: "Something wrong? Reply to any email from us and we will fix it.",
    notKnownYet: "Not known yet",
  },
  nl: {
    services: "Mijn diensten",
    serviceKicker: "Dienst",
    backToServices: "Al mijn diensten",
    documents: "Mijn documenten",
    documentsLead:
      "Alles wat wij hebben gecontroleerd en goedgekeurd. U kunt het altijd opnieuw openen — bij de bank, bij de notaris, of over een paar jaar.",
    profile: "Mijn gegevens",
    profileLead:
      "Wat wij van u hebben vastgelegd. Staat er iets verkeerd, laat het ons weten en wij passen het aan.",
    home: "Start",
    documentsEmpty:
      "Hier staat nog niets. Documenten verschijnen zodra wij ze hebben gecontroleerd en blijven daarna beschikbaar.",
    download: "Downloaden",
    usedFor: "Gebruikt voor",
    profilePersonal: "Over u",
    profileIdentification: "Uw nummers",
    profileContact: "Hoe wij u bereiken",
    profileAddress: "Adressen",
    profileCorrect: "Staat er iets verkeerd? Beantwoord een e-mail van ons en wij passen het aan.",
    notKnownYet: "Nog niet bekend",
  },
  es: {
    services: "Mis servicios",
    serviceKicker: "Servicio",
    backToServices: "Todos mis servicios",
    documents: "Mis documentos",
    documentsLead:
      "Todo lo que hemos comprobado y aceptado. Puede abrirlo de nuevo cuando lo necesite: en el banco, en la notaría o dentro de unos años.",
    profile: "Mis datos",
    profileLead: "Lo que tenemos sobre usted. Si algo no está bien, díganoslo y lo corregimos.",
    home: "Inicio",
    documentsEmpty:
      "Aquí todavía no hay nada. Los documentos aparecen cuando los hemos comprobado y permanecen disponibles.",
    download: "Descargar",
    usedFor: "Se usa para",
    profilePersonal: "Sobre usted",
    profileIdentification: "Sus números",
    profileContact: "Cómo contactamos con usted",
    profileAddress: "Direcciones",
    profileCorrect: "¿Algo no está bien? Responda a cualquier correo nuestro y lo corregimos.",
    notKnownYet: "Aún no se conoce",
  },
};
