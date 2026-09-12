"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  const { todos, ready, updateTodoStatus, deleteTodo } = useDiaryData();
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
    // 필터 때문에 항목이 사라져 안 보이는 경우, 바꾼 상태로 따라가기
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
          체크하면 완료됩니다. 다시 점검이 필요하면{" "}
          <span className="font-semibold text-[var(--ink)]">대기로</span> 또는{" "}
          <span className="font-semibold text-[var(--ink)]">진행중으로</span> 되돌릴
          수 있습니다.
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
            <li
              key={todo.id}
              className="paper-panel rounded-[1.1rem] px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={todo.status === "done"}
                  onChange={() =>
                    void changeStatus(
                      todo.id,
                      todo.status === "done" ? "pending" : "done",
                    )
                  }
                  className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  title={
                    todo.status === "done"
                      ? "체크 해제하면 대기로 돌아갑니다"
                      : "완료로 표시"
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p
                      className={`min-w-0 flex-1 text-sm leading-relaxed ${
                        todo.status === "done"
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--ink)]"
                      }`}
                    >
                      {todo.title}
                    </p>
                    <button
                      type="button"
                      aria-label="할일 삭제"
                      onClick={() => {
                        if (confirm("이 할일을 삭제할까요?")) {
                          void deleteTodo(todo.id);
                        }
                      }}
                      className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--chip-todo)] hover:text-[var(--accent)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      ["pending", "in_progress", "done"] as TodoStatus[]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void changeStatus(todo.id, status)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          todo.status === status
                            ? "bg-[var(--ink)] text-[var(--paper)]"
                            : "bg-black/5 text-[var(--muted)] hover:bg-black/10 hover:text-[var(--ink)]"
                        }`}
                      >
                        {TODO_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>

                  {todo.status === "done" && (
                    <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-[var(--chip-thought)]/80 p-2">
                      <span className="flex items-center gap-1 px-1 text-[11px] font-semibold text-[var(--muted)]">
                        <RotateCcw size={12} />
                        다시 열기
                      </span>
                      <button
                        type="button"
                        onClick={() => void changeStatus(todo.id, "pending")}
                        className="rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)] shadow-sm"
                      >
                        대기로
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void changeStatus(todo.id, "in_progress")
                        }
                        className="rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)] shadow-sm"
                      >
                        진행중으로
                      </button>
                    </div>
                  )}

                  {todo.due_date && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      마감 {todo.due_date}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
