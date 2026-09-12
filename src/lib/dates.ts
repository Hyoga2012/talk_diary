/** Asia/Seoul (or client) date helpers for relative Korean dates */

export interface DateAnchors {
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
  timeZone: string;
}

export function formatYmdInTimeZone(
  date: Date,
  timeZone = "Asia/Seoul",
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function buildDateAnchors(
  clientDate?: string | null,
  timeZone = "Asia/Seoul",
): DateAnchors {
  const today =
    clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)
      ? clientDate
      : formatYmdInTimeZone(new Date(), timeZone);

  return {
    today,
    tomorrow: addDaysToYmd(today, 1),
    dayAfterTomorrow: addDaysToYmd(today, 2),
    timeZone,
  };
}

/**
 * Whisper/GPT가 상대 날짜를 놓칠 때를 대비한 보정.
 * "내일", "모레" 등이 있으면 entry_date / due_date를 강제 맞춤.
 */
export function applyKoreanRelativeDates<
  T extends {
    entry_date: string;
    due_date?: string | null;
    is_todo?: boolean;
    category?: string;
    title?: string;
    content?: string;
  },
>(transcript: string, items: T[], anchors: DateAnchors): T[] {
  return items.map((item) => {
    const blob = `${transcript}\n${item.title ?? ""}\n${item.content ?? ""}`;
    const resolved = resolveRelativeDate(blob, item.entry_date, anchors);

    let due_date = item.due_date ?? null;
    if (item.is_todo || item.category === "todo") {
      const dueResolved = resolveRelativeDate(
        blob,
        due_date || item.entry_date,
        anchors,
      );
      due_date = dueResolved;
    }

    return {
      ...item,
      entry_date: resolved,
      due_date,
    };
  });
}

function resolveRelativeDate(
  text: string,
  fallback: string,
  anchors: DateAnchors,
): string {
  const compact = text.replace(/\s+/g, "");

  // 더 구체적인 표현 우선
  if (/모레|내일모레/.test(compact)) {
    return anchors.dayAfterTomorrow;
  }
  if (/내일|명일/.test(compact)) {
    return anchors.tomorrow;
  }
  if (/오늘|금일/.test(compact)) {
    return anchors.today;
  }

  // AI가 준 날짜가 있으면 유지, 없으면 오늘
  if (/^\d{4}-\d{2}-\d{2}$/.test(fallback)) {
    return fallback;
  }
  return anchors.today;
}
