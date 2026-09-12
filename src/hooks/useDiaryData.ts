"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiaryEntry, TodoItem } from "@/lib/types";
import {
  getDeviceId,
  loadLocalEntries,
  loadLocalTodos,
  saveLocalEntries,
  saveLocalTodos,
} from "@/lib/local-store";

export function useDiaryData() {
  const [deviceId, setDeviceId] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (id: string) => {
    const localEntries = loadLocalEntries<DiaryEntry>();
    const localTodos = loadLocalTodos<TodoItem>();

    try {
      const [entriesRes, todosRes] = await Promise.all([
        fetch(`/api/entries?deviceId=${encodeURIComponent(id)}`),
        fetch(`/api/todos?deviceId=${encodeURIComponent(id)}`),
      ]);
      const entriesJson = await entriesRes.json();
      const todosJson = await todosRes.json();

      if (entriesJson.storage === "supabase" && Array.isArray(entriesJson.entries)) {
        const remote = entriesJson.entries as DiaryEntry[];
        const merged = mergeById(remote, localEntries);
        setEntries(merged);
        saveLocalEntries(merged);
      } else {
        setEntries(localEntries);
      }

      if (todosJson.storage === "supabase" && Array.isArray(todosJson.todos)) {
        const remote = todosJson.todos as TodoItem[];
        const merged = mergeById(remote, localTodos);
        setTodos(merged);
        saveLocalTodos(merged);
      } else {
        setTodos(localTodos);
      }
    } catch {
      setEntries(localEntries);
      setTodos(localTodos);
    }
  }, []);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    void refresh(id).finally(() => setReady(true));
  }, [refresh]);

  const appendVoiceResult = useCallback(
    (payload: {
      entries: DiaryEntry[];
      todos: TodoItem[];
      storage: string;
    }) => {
      setEntries((prev) => {
        const next = [...payload.entries, ...prev];
        saveLocalEntries(next);
        return next;
      });
      if (payload.todos.length) {
        setTodos((prev) => {
          const next = [...payload.todos, ...prev];
          saveLocalTodos(next);
          return next;
        });
      }
    },
    [],
  );

  const updateTodoStatus = useCallback(
    async (id: string, status: TodoItem["status"]) => {
      setTodos((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, status } : t));
        saveLocalTodos(next);
        return next;
      });

      await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, deviceId }),
      });
    },
    [deviceId],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveLocalEntries(next);
        return next;
      });
      setTodos((prev) => {
        const next = prev.filter((t) => t.entry_id !== id);
        saveLocalTodos(next);
        return next;
      });

      await fetch("/api/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deviceId }),
      });
    },
    [deviceId],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveLocalTodos(next);
        return next;
      });

      await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deviceId }),
      });
    },
    [deviceId],
  );

  return {
    deviceId,
    entries,
    todos,
    ready,
    refresh: () => (deviceId ? refresh(deviceId) : Promise.resolve()),
    appendVoiceResult,
    updateTodoStatus,
    deleteEntry,
    deleteTodo,
  };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]) {
  const map = new Map<string, T>();
  [...secondary, ...primary].forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => {
    const aTime =
      "created_at" in a ? String((a as { created_at: string }).created_at) : "";
    const bTime =
      "created_at" in b ? String((b as { created_at: string }).created_at) : "";
    return bTime.localeCompare(aTime);
  });
}
