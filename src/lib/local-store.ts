const DEVICE_KEY = "talk_diary_device_id";
const ENTRIES_KEY = "talk_diary_entries";
const TODOS_KEY = "talk_diary_todos";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function loadLocalEntries<T>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || "[]") as T[];
  } catch {
    return [];
  }
}

export function saveLocalEntries<T>(entries: T[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadLocalTodos<T>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TODOS_KEY) || "[]") as T[];
  } catch {
    return [];
  }
}

export function saveLocalTodos<T>(todos: T[]) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}
