"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface DiaryCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  markedDates: string[];
}

export function DiaryCalendar({
  selectedDate,
  onSelect,
  markedDates,
}: DiaryCalendarProps) {
  const [cursor, setCursor] = useState(startOfMonth(selectedDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const marked = useMemo(() => new Set(markedDates), [markedDates]);

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => setCursor((d) => subMonths(d, 1))}
          className="rounded-full p-2 text-[var(--ink)] hover:bg-black/5"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          {format(cursor, "yyyy년 M월", { locale: ko })}
        </h2>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => setCursor((d) => addMonths(d, 1))}
          className="rounded-full p-2 text-[var(--ink)] hover:bg-black/5"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-[var(--muted)]">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const selected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, cursor);
          const hasMark = marked.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm transition ${
                selected
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : inMonth
                    ? "text-[var(--ink)] hover:bg-black/5"
                    : "text-[var(--muted)]/50"
              }`}
            >
              {format(day, "d")}
              {hasMark && (
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                    selected ? "bg-[var(--paper)]" : "bg-[var(--accent)]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
