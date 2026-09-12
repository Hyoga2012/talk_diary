"use client";

import { useMemo, useState } from "react";
import { TodoCard } from "@/components/TodoCard";
import { useDiaryData } from "@/hooks/useDiaryData";
import type { TodoStatus } from "@/lib/types";
import { TODO_STATUS_LABELS } from "@/lib/types";

const filters: Array<TodoStatus | "all"> = [
  "all",
  "pending",
  "in_progress",
  "done",
];

export default function TodosPage() {
  const { todos, ready, updateTodoStatus, updateTodo, deleteTodo } =
    useDiaryData();
  const [filter, setFilter] = useState<TodoStatus | "all">("all");

  const visible = useMemo(() => {
    if (filter === "all") return todos;
    return todos.filter((t) => t.status === filter);
  }, [todos, filter]);

  const progress = useMemo(() => {
    if (todos.length === 0) return 0;
    const done = todos.filter((t) => t.status === "done").length;
    return Math.round((done / todos.length) * 100);
  }, [todos]);

  const changeStatus = async (id: string, status: TodoStatus) => {
    await updateTodoStatus(id, status);
    if (filter !== "all" && filter !== status) {
      setFilter(status);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 pb-28 pt-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          할일
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          연필 아이콘으로 오타·마감일을 고치고, 완료 후엔 대기/진행중으로 되돌릴 수
          있습니다.
        </p>
      </header>

      <section className="paper-panel rounded-[1.25rem] px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">완료율</span>
          <span className="font-semibold text-[var(--ink)]">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          전체 {todos.length}개 · 완료{" "}
          {todos.filter((t) => t.status === "done").length}개
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-black/5 text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {f === "all" ? "전체" : TODO_STATUS_LABELS[f]}
            {f !== "all" && (
              <span className="ml-1 opacity-70">
                {todos.filter((t) => t.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <div className="paper-panel rounded-[1.25rem] px-4 py-10 text-center text-sm text-[var(--muted)]">
          {filter === "done"
            ? "완료된 할일이 없습니다."
            : "할일이 없습니다. “모레 2시까지 ~~ 할거야”처럼 말해 보세요."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onDelete={deleteTodo}
              onUpdate={async (id, patch) => {
                await updateTodo(id, patch);
                if (filter !== "all" && filter !== patch.status) {
                  setFilter(patch.status);
                }
              }}
              onStatusChange={(id, status) => void changeStatus(id, status)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
