"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import type { Locale } from "@/lib/brand";
import { NewClientForm } from "./NewClientForm";
import s from "./GuideList.module.css";

/**
 * The create form used to stand open above the client list all day. It is a thing
 * you do a few times a week; browsing is what the page is for.
 */
export function NewClientButton({ defaultLocale }: { defaultLocale: Locale }) {
  const { t } = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={s.newButton} onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> {t.clients.newClient}
      </button>

      {open && (
        <Modal title={t.clients.newClient} onClose={() => setOpen(false)}>
          <NewClientForm
            defaultLocale={defaultLocale}
            onSaved={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
