"use client";

import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { TodoItem, TodoStatus } from "@/lib/types";
import { TODO_STATUS_LABELS } from "@/lib/types";

export type TodoUpdate = {
  title: string;
  due_date: string | null;
  status: TodoStatus;
};

export function TodoCard({
  todo,
  onDelete,
  onUpdate,
  onStatusChange,
}: {
  todo: TodoItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: TodoUpdate) => Promise<void> | void;
  onStatusChange: (id: string, status: TodoStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.due_date || "");
  const [status, setStatus] = useState<TodoStatus>(todo.status);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTitle(todo.title);
    setDueDate(todo.due_date || "");
    setStatus(todo.status);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setTitle(todo.title);
    setDueDate(todo.due_date || "");
    setStatus(todo.status);
  };

  const saveEdit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setSaving(true);
    try {
      await onUpdate(todo.id, {
        title: nextTitle,
        due_date: dueDate || null,
        status,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className="paper-panel rounded-[1.1rem] px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--muted)]">할일 수정</p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="취소"
              onClick={cancelEdit}
              className="rounded-full p-1.5 text-[var(--muted)] hover:bg-black/5"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              aria-label="저장"
              onClick={() => void saveEdit()}
              disabled={saving}
              className="rounded-full p-1.5 text-[var(--accent)] hover:bg-[var(--chip-todo)]"
            >
              <Check size={16} />
            </button>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[var(--muted)]">
          할일 내용
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            마감일
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--muted)]">
            상태
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TodoStatus)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {(Object.keys(TODO_STATUS_LABELS) as TodoStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TODO_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void saveEdit()}
          disabled={saving}
          className="mt-3 w-full rounded-xl bg-[var(--ink)] py-2.5 text-sm font-semibold text-[var(--paper)] disabled:opacity-60"
        >
          {saving ? "저장 중..." : "수정 저장"}
        </button>
      </li>
    );
  }

  return (
    <li className="paper-panel rounded-[1.1rem] px-4 py-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.status === "done"}
          onChange={() =>
            onStatusChange(
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
              aria-label="할일 수정"
              onClick={startEdit}
              className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              aria-label="할일 삭제"
              onClick={() => {
                if (confirm("이 할일을 삭제할까요?")) onDelete(todo.id);
              }}
              className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--chip-todo)] hover:text-[var(--accent)]"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["pending", "in_progress", "done"] as TodoStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(todo.id, s)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  todo.status === s
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-black/5 text-[var(--muted)] hover:bg-black/10 hover:text-[var(--ink)]"
                }`}
              >
                {TODO_STATUS_LABELS[s]}
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
                onClick={() => onStatusChange(todo.id, "pending")}
                className="rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)] shadow-sm"
              >
                대기로
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(todo.id, "in_progress")}
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
  );
}
