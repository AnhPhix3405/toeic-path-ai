"use client";

import React, { useState } from "react";
import { CheckCircle2, Headphones, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AudioCheckWidgetProps {
  onVerifiedChange?: (verified: boolean) => void;
}

export function AudioCheckWidget({ onVerifiedChange }: AudioCheckWidgetProps) {
  const [isPlayingTone, setIsPlayingTone] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);

  const playTestSound = () => {
    setIsPlayingTone(true);
    setAudioNote(null);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtx) {
        setAudioNote(
          "Trình duyệt không hỗ trợ Web Audio API; vui lòng bật âm lượng hệ thống để kiểm tra loa."
        );
        setIsPlayingTone(false);
        return;
      }

      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 pleasant test chime
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.16 + 0.3
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.32);
      });

      setTimeout(() => {
        setIsPlayingTone(false);
        ctx.close().catch(() => undefined);
      }, 750);
    } catch {
      setIsPlayingTone(false);
      setAudioNote("Không thể phát âm thanh thử nghiệm. Vui lòng kiểm tra loa.");
    }
  };

  const toggleVerified = () => {
    const next = !isVerified;
    setIsVerified(next);
    onVerifiedChange?.(next);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Kiểm tra thiết bị âm thanh (Audio Check)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Hãy đảm bảo tai nghe hoặc loa hoạt động rõ ràng trước khi vào các
              phần thi Nghe (Part 1 – Part 4).
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={playTestSound}
          disabled={isPlayingTone}
          className="rounded-xl text-xs shrink-0 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
          {isPlayingTone ? "Đang phát âm thanh mẫu..." : "Nghe thử âm thanh"}
        </Button>
      </div>

      {audioNote && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{audioNote}</p>
      )}

      <div className="pt-1 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleVerified}
          aria-pressed={isVerified}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer",
            isVerified
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <CheckCircle2
            className={cn(
              "w-4 h-4",
              isVerified ? "text-emerald-600" : "text-slate-400"
            )}
          />
          {isVerified
            ? "Đã xác nhận nghe rõ âm thanh"
            : "Tôi nghe rõ âm thanh thử nghiệm"}
        </button>
      </div>
    </div>
  );
}
