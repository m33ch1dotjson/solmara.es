"use client";

import { useTransition } from "react";
import { newGuideAction } from "@/app/admin/process-guide/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./GuideList.module.css";

/**
 * One compact button, top right. Creating a guide is rare — a form standing open at
 * the top of the page all day said the opposite.
 */
export function NewGuideButton() {
  const { t } = useCopy();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={s.newButton}
      disabled={pending}
      onClick={() => start(() => newGuideAction())}
    >
      <span aria-hidden="true">+</span> {pending ? t.common.busy : t.guides.newGuide}
    </button>
  );
}
