"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadGuideFileAction } from "@/app/admin/process-guide/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./RichTextEditor.module.css";

/*
 * A small document editor: a toolbar and a contentEditable.
 *
 * It uses document.execCommand, which is deprecated and which every browser still
 * implements because the web is full of editors like this one. The alternative was a
 * rich-text framework — a dependency measured in megabytes, carrying its own document
 * model, for seven formatting buttons in a staff tool. If the editing needs ever grow
 * past this (comments, collaboration, a real document model), that is the moment to
 * take the dependency, not before.
 *
 * Whatever the browser produces here is not trusted. It is sanitised on the server in
 * lib/sanitize.ts before it is stored, which is also what protects against somebody
 * pasting formatted HTML out of Word.
 */

type Command = { key: string; label: string; run: () => void; wide?: boolean };

export function RichTextEditor({
  guideId,
  value,
  onChange,
}: {
  guideId: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const { t } = useCopy();
  const area = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  // Set once. Writing `value` back into the DOM on every keystroke would move the
  // caret to the start of the document on every letter typed.
  useEffect(() => {
    if (area.current && area.current.innerHTML !== value) area.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    if (area.current) onChange(area.current.innerHTML);
  }

  function exec(command: string, argument?: string) {
    area.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  }

  function block(tag: string) {
    // Firefox wants the angle brackets; the others accept both.
    exec("formatBlock", `<${tag}>`);
  }

  function link() {
    const url = window.prompt(t.guides.linkPrompt, "https://");
    if (!url) return;
    exec("createLink", url);
    // Links out of a handbook go to government sites and portals: a new tab, so
    // somebody does not lose the instructions they were following.
    const selection = window.getSelection();
    const anchor = selection?.anchorNode?.parentElement?.closest("a");
    if (anchor) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noreferrer noopener");
    }
    emit();
  }

  function table() {
    const rows = 3;
    const columns = 3;
    const head = `<tr>${`<th>&nbsp;</th>`.repeat(columns)}</tr>`;
    const body = `<tr>${`<td>&nbsp;</td>`.repeat(columns)}</tr>`.repeat(rows - 1);
    exec("insertHTML", `<table><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`);
  }

  function insertImage(file: File) {
    setProblem(null);
    startUpload(async () => {
      const form = new FormData();
      form.set("guideId", guideId);
      form.set("kind", "IMAGE");
      form.set("file", file);
      const result = await uploadGuideFileAction(form);
      if (!result.ok) {
        setProblem(result.error);
        return;
      }
      // The stored src is our own file route, never a signed URL: those expire in
      // ten minutes and this document is meant to outlive that by years.
      exec(
        "insertHTML",
        `<p><img src="/admin/process-guide/file/${result.id}" alt="${result.filename.replace(/"/g, "")}"></p>`,
      );
    });
  }

  const commands: Command[] = [
    { key: "h1", label: t.guides.toolHeading1, run: () => block("h1"), wide: true },
    { key: "h2", label: t.guides.toolHeading2, run: () => block("h2"), wide: true },
    { key: "h3", label: t.guides.toolHeading3, run: () => block("h3"), wide: true },
    { key: "p", label: t.guides.toolParagraph, run: () => block("p"), wide: true },
    { key: "bold", label: "B", run: () => exec("bold") },
    { key: "italic", label: "I", run: () => exec("italic") },
    { key: "underline", label: "U", run: () => exec("underline") },
    { key: "ul", label: "• —", run: () => exec("insertUnorderedList") },
    { key: "ol", label: "1.", run: () => exec("insertOrderedList") },
    { key: "hr", label: "—", run: () => exec("insertHorizontalRule") },
  ];

  return (
    <div className={s.editor}>
      <div className={s.toolbar} role="toolbar" aria-label={t.guides.toolbar}>
        {commands.map((command) => (
          <button
            key={command.key}
            type="button"
            className={command.wide ? `${s.tool} ${s.toolWide}` : s.tool}
            onMouseDown={(event) => event.preventDefault()}
            onClick={command.run}
            title={command.label}
          >
            {command.label}
          </button>
        ))}

        <span className={s.toolLine} />

        <button
          type="button"
          className={`${s.tool} ${s.toolWide}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={link}
        >
          {t.guides.toolLink}
        </button>
        <button
          type="button"
          className={`${s.tool} ${s.toolWide}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={table}
        >
          {t.guides.toolTable}
        </button>
        <button
          type="button"
          className={`${s.tool} ${s.toolWide}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => imageInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? t.common.busy : t.guides.toolImage}
        </button>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className={s.hiddenInput}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) insertImage(file);
          event.target.value = "";
        }}
      />

      {problem && <p className={s.problem}>{problem}</p>}

      <div
        ref={area}
        className={s.area}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={t.guides.bodyLabel}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
