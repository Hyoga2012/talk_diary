import { google } from "googleapis";
import { format } from "date-fns";
import type { DiaryEntry, TodoItem } from "@/lib/types";
import { getAuthedClient, type GoogleTokenSet } from "./oauth";

function ymdFromDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function ymdFromGoogleDate(
  date?: string | null,
  dateTime?: string | null,
): string {
  if (date) return date.slice(0, 10);
  if (dateTime) return dateTime.slice(0, 10);
  return ymdFromDate(new Date());
}

export async function importGoogleData(
  tokenSet: GoogleTokenSet,
  options?: { daysBack?: number; daysForward?: number },
) {
  const daysBack = options?.daysBack ?? 7;
  const daysForward = options?.daysForward ?? 30;

  const { client, tokenSet: refreshed } = await getAuthedClient(tokenSet);
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - daysBack);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + daysForward);

  const calendar = google.calendar({ version: "v3", auth: client });
  const tasksApi = google.tasks({ version: "v1", auth: client });

  const entries: DiaryEntry[] = [];
  const todos: TodoItem[] = [];
  const stamp = now.toISOString();

  // ---- Calendar events ----
  const calList = await calendar.calendarList.list({ maxResults: 50 });
  const calendars = calList.data.items || [];

  for (const cal of calendars) {
    if (!cal.id || cal.deleted) continue;
    const events = await calendar.events.list({
      calendarId: cal.id,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    for (const event of events.data.items || []) {
      if (!event.id || event.status === "cancelled") continue;
      const title = (event.summary || "제목 없는 일정").trim();
      const entryDate = ymdFromGoogleDate(
        event.start?.date,
        event.start?.dateTime,
      );
      const description = (event.description || "").trim();
      const location = (event.location || "").trim();
      const contentParts = [
        description || title,
        location ? `장소: ${location}` : "",
        cal.summary ? `캘린더: ${cal.summary}` : "",
        "출처: Google Calendar",
      ].filter(Boolean);

      entries.push({
        id: crypto.randomUUID(),
        category: "schedule",
        title: title.slice(0, 80),
        content: contentParts.join("\n"),
        raw_transcript: `google_calendar:${event.id}`,
        entry_date: entryDate,
        scheduled_at: event.start?.dateTime || null,
        images: [],
        created_at: stamp,
        source: "google_calendar",
        source_id: event.id,
      });
    }
  }

  // ---- Google Tasks ----
  const taskLists = await tasksApi.tasklists.list({ maxResults: 50 });
  for (const list of taskLists.data.items || []) {
    if (!list.id) continue;
    const taskRes = await tasksApi.tasks.list({
      tasklist: list.id,
      showCompleted: true,
      showHidden: true,
      maxResults: 100,
    });

    for (const task of taskRes.data.items || []) {
      if (!task.id || task.deleted) continue;
      const title = (task.title || "할일").trim();
      const due = task.due ? task.due.slice(0, 10) : null;
      const status =
        task.status === "completed" ? ("done" as const) : ("pending" as const);

      todos.push({
        id: crypto.randomUUID(),
        entry_id: null,
        title: list.title ? `[${list.title}] ${title}` : title,
        status,
        due_date: due,
        created_at: stamp,
        source: "google_tasks",
        source_id: task.id,
      });

      // Also mirror as a diary note/todo on due date (or today)
      entries.push({
        id: crypto.randomUUID(),
        category: "todo",
        title: title.slice(0, 80),
        content: [
          task.notes?.trim() || title,
          list.title ? `목록: ${list.title}` : "",
          "출처: Google Tasks",
        ]
          .filter(Boolean)
          .join("\n"),
        raw_transcript: `google_tasks:${task.id}`,
        entry_date: due || ymdFromDate(now),
        scheduled_at: null,
        images: [],
        created_at: stamp,
        source: "google_tasks",
        source_id: task.id,
      });
    }
  }

  return {
    entries,
    todos,
    tokenSet: refreshed,
    email: refreshed.email || tokenSet.email || null,
    range: {
      from: ymdFromDate(timeMin),
      to: ymdFromDate(timeMax),
    },
  };
}
