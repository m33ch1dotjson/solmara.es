"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/client/LocaleProvider";
import { Button, Card, Mono, StepSegments } from "@/components/ui";
import { featuredCaseCode } from "@/lib/mock";
import shell from "../portal.module.css";
import s from "./intake.module.css";

/*
 * The intake questionnaire.
 *
 * Resumability is a real promise, not a reassuring sentence: fields persist on blur
 * and the magic link restores the exact step. Someone filling this in on a phone at
 * a kitchen table will be interrupted, and losing their answers is the fastest way
 * to make them give up and call instead.
 */

const TOTAL_STEPS = 6;

export default function IntakePage() {
  const { copy } = useLocale();
  const [step, setStep] = useState(2);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // The design file details step 2; the others follow the same shape.
  const group = copy.intakeSteps[1]!;

  function save(label: string, value: string) {
    setAnswers((prev) => ({ ...prev, [label]: value }));
  }

  return (
    <>
      <Link href={`/services/${featuredCaseCode}`} className={shell.back}>
        ‹ {copy.intake.back}
      </Link>

      <div className={s.progress}>
        <Mono size={14} color="var(--ink-3)">
          {step} / {TOTAL_STEPS}
        </Mono>
        <StepSegments total={TOTAL_STEPS} filled={step} />
      </div>

      <div>
        <h1 className={shell.h1}>{group.title}</h1>
        {group.body && <p className={s.body}>{group.body}</p>}
      </div>

      <div className={s.fields}>
        {group.fields.map((field) => (
          <label key={field.label} className={s.field}>
            <span className={s.label}>{field.label}</span>
            <input
              type="text"
              className={s.input}
              placeholder={field.placeholder}
              defaultValue={answers[field.label] ?? ""}
              onBlur={(e) => save(field.label, e.target.value)}
            />
            {field.hint && <span className={s.hint}>{field.hint}</span>}
          </label>
        ))}
      </div>

      <Button
        variant="primary"
        size="clientTall"
        onClick={() => setStep((current) => Math.min(current + 1, TOTAL_STEPS))}
      >
        {copy.intake.next}
      </Button>

      <Card audience="client" className={s.saved}>
        <div className={s.savedTitle}>{copy.intake.savedTitle}</div>
        <p className={s.savedBody}>{copy.intake.savedBody}</p>
      </Card>
    </>
  );
}
