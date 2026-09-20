"use client";

import { useState } from "react";
import type { Task } from "@/lib/domain";
import s from "./TaskList.module.css";

/**
 * Tasks toggle optimistically: clicking the row flips it immediately and the write
 * follows. A checklist that waits for a round trip feels broken when someone is
 * ticking off four things in a row.
 */
export function TaskList({ tasks }: { tasks: Task[] }) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.done])),
  );

  return (
    <div className={s.list}>
      {tasks.map((task) => {
        const isDone = done[task.id] ?? task.done;
        return (
          <button
            key={task.id}
            type="button"
            className={s.row}
            aria-pressed={isDone}
            onClick={() => setDone((prev) => ({ ...prev, [task.id]: !isDone }))}
          >
            <span className={isDone ? `${s.box} ${s.boxDone}` : s.box} aria-hidden="true">
              {isDone ? "✓" : ""}
            </span>
            <span className={isDone ? `${s.title} ${s.titleDone}` : s.title}>{task.title}</span>
            <span className={task.due === "Today" ? `${s.due} ${s.dueToday}` : s.due}>
              {task.due}
            </span>
            <span className={s.owner}>{task.assignee}</span>
          </button>
        );
      })}
    </div>
  );
}
