"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

type RecorderStatus = "idle" | "recording" | "processing";

interface VoiceRecorderProps {
  onResult: (payload: {
    transcript: string;
    entries: unknown[];
    todos: unknown[];
    storage: string;
  }) => void;
  onError: (message: string) => void;
  deviceId: string;
}

export function VoiceRecorder({
  onResult,
  onError,
  deviceId,
}: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    clearTimer();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setStatus("processing");

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `voice.${extension}`, { type: blob.type });

        const form = new FormData();
        form.append("audio", file);
        form.append("deviceId", deviceId);

        try {
          const res = await fetch("/api/voice", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) {
            onError(data.error || "음성 처리에 실패했습니다.");
            setStatus("idle");
            setSeconds(0);
            return;
          }
          onResult(data);
        } catch {
          onError("네트워크 오류로 음성 처리에 실패했습니다.");
        } finally {
          setStatus("idle");
          setSeconds(0);
        }
      };

      recorder.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      onError("마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
      setStatus("idle");
    }
  }, [deviceId, onError, onResult]);

  const toggle = () => {
    if (status === "processing") return;
    if (status === "recording") {
      stopRecording();
      return;
    }
    void startRecording();
  };

  const label =
    status === "recording"
      ? "녹음 중지"
      : status === "processing"
        ? "분석 중..."
        : "말하기";

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        disabled={status === "processing"}
        aria-label={label}
        className={`voice-btn relative flex h-36 w-36 items-center justify-center rounded-full text-white shadow-[0_18px_50px_rgba(180,45,58,0.35)] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-wait sm:h-40 sm:w-40 ${
          status === "recording" ? "recording scale-[1.03]" : "idle"
        } ${status === "processing" ? "opacity-80" : "hover:scale-[1.04] active:scale-95"}`}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_45%)]" />
        {status === "processing" ? (
          <Loader2 className="relative h-12 w-12 animate-spin" />
        ) : status === "recording" ? (
          <Square className="relative h-11 w-11 fill-current" />
        ) : (
          <Mic className="relative h-14 w-14" strokeWidth={1.75} />
        )}
      </button>

      <div className="text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {status === "recording"
            ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} · 다시 누르면 저장`
            : status === "processing"
              ? "음성을 글로 바꾸고 분류하는 중"
              : "버튼을 눌러 일정·생각·아이디어를 말하세요"}
        </p>
      </div>
    </div>
  );
}
