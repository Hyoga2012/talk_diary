export type EntryCategory = "schedule" | "thought" | "idea" | "note" | "todo";

export type TodoStatus = "pending" | "in_progress" | "done";

export interface EntryImage {
  id: string;
  url: string;
  path?: string | null;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  category: EntryCategory;
  title: string;
  content: string;
  raw_transcript?: string | null;
  entry_date: string; // YYYY-MM-DD
  scheduled_at?: string | null;
  images?: EntryImage[];
  created_at: string;
  source?: "voice" | "google_calendar" | "google_tasks" | "manual";
  source_id?: string | null;
}

export interface TodoItem {
  id: string;
  entry_id?: string | null;
  title: string;
  status: TodoStatus;
  due_date?: string | null;
  created_at: string;
  source?: "voice" | "google_tasks" | "manual";
  source_id?: string | null;
}

export interface ClassifiedItem {
  category: EntryCategory;
  title: string;
  content: string;
  entry_date: string;
  scheduled_at?: string | null;
  is_todo?: boolean;
  todo_title?: string | null;
  due_date?: string | null;
}

export const CATEGORY_LABELS: Record<EntryCategory, string> = {
  schedule: "일정",
  thought: "생각",
  idea: "아이디어",
  note: "메모",
  todo: "할일",
};

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  done: "완료",
};
