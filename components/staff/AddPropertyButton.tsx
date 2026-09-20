"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import { PropertyForm } from "./PropertyForm";
import s from "./GuideList.module.css";

/**
 * The Properties page is for looking at properties. Adding one is a thing you do a
 * few times a month, so it lives behind a button and a dialog instead of standing
 * open at the top of the page pushing the listings below the fold.
 */
export function AddPropertyButton() {
  const { t } = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={s.newButton} onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> {t.properties.add}
      </button>

      {open && (
        <Modal title={t.properties.add} onClose={() => setOpen(false)}>
          <PropertyForm
            onSaved={() => {
              setOpen(false);
              // The list behind the dialog is now out of date.
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
