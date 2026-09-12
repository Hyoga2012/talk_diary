"use client";

import { CalendarSync, Loader2, LogOut, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DiaryEntry, TodoItem } from "@/lib/types";

type Status = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};

export function GoogleSyncPanel({
  deviceId,
  onImported,
}: {
  deviceId: string;
  onImported: (payload: {
    entries: DiaryEntry[];
    todos: TodoItem[];
  }) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google/status");
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch {
      setStatus({ configured: false, connected: false, email: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (!google) return;

    if (google === "connected") {
      setMessage("Google 계정이 연결되었습니다. 가져오기를 눌러 주세요.");
      void refreshStatus();
    } else if (google === "error") {
      setError(params.get("message") || "Google 연결에 실패했습니다.");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url.pathname);
  }, [refreshStatus]);

  const connect = () => {
    window.location.href = `/api/google/auth?deviceId=${encodeURIComponent(deviceId)}`;
  };

  const disconnect = async () => {
    await fetch("/api/google/status", { method: "DELETE" });
    setMessage("Google 연결을 해제했습니다.");
    await refreshStatus();
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/google/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          daysBack: 7,
          daysForward: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "가져오기 실패");

      onImported({
        entries: (data.entries || []) as DiaryEntry[],
        todos: (data.todos || []) as TodoItem[],
      });

      setMessage(
        `가져오기 완료 · 일정/기록 ${(data.entries || []).length}개, 할일 ${(data.todos || []).length}개 (${data.range?.from} ~ ${data.range?.to})`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="paper-panel rounded-[1.5rem] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-[var(--chip-schedule)] p-2 text-[var(--ink)]">
          <CalendarSync size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            Google 일정·할일
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Google 캘린더와 Tasks를 Talk Diary로 가져옵니다. (최근 7일 ~ 앞으로
            30일)
          </p>

          {loading ? (
            <p className="mt-3 text-xs text-[var(--muted)]">상태 확인 중...</p>
          ) : !status?.configured ? (
            <p className="mt-3 text-xs text-[var(--accent)]">
              아직 Google OAuth 설정 전입니다. README의 Google 설정 단계를 먼저
              진행해 주세요.
            </p>
          ) : status.connected ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[var(--ink)]">
                연결됨
                {status.email ? (
                  <span className="text-[var(--muted)]"> · {status.email}</span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void runImport()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[11px] font-semibold text-[var(--paper)] disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CalendarSync size={14} />
                  )}
                  가져오기
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]"
                >
                  <LogOut size={14} />
                  연결 해제
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={connect}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[11px] font-semibold text-[var(--paper)]"
            >
              <Unplug size={14} />
              Google 계정 연결
            </button>
          )}

          {message && (
            <p className="mt-3 rounded-xl bg-[var(--chip-idea)] px-3 py-2 text-xs text-[var(--ink)]">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-[var(--chip-todo)] px-3 py-2 text-xs text-[var(--ink)]">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
