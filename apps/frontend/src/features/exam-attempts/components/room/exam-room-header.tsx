"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Grid3X3,
  LogOut,
  Maximize2,
  Minimize2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamSyncStatus } from "@/types/exam-attempt";
import { ExamConnectionBadge } from "../shared/exam-connection-badge";
import { ExamCountdownTimer } from "./exam-countdown-timer";

export interface ExamRoomHeaderProps {
  examTitle: string;
  modeLabel: string;
  answeredCount: number;
  totalQuestions: number;
  expiresAt: string;
  serverTimeOffsetMs: number;
  isForceExpired: boolean;
  syncStatus: ExamSyncStatus;
  pendingCount: number;
  onManualSync: () => void;
  onOpenPaletteDrawer: () => void;
  onExpire: () => void;
  onRequestSubmit?: () => void;
  isSubmitting?: boolean;
}

export function ExamRoomHeader({
  examTitle,
  modeLabel,
  answeredCount,
  totalQuestions,
  expiresAt,
  serverTimeOffsetMs,
  isForceExpired,
  syncStatus,
  pendingCount,
  onManualSync,
  onOpenPaletteDrawer,
  onExpire,
  onRequestSubmit,
  isSubmitting = false,
}: ExamRoomHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen may be blocked in automated/headless browsers
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-16 flex items-center justify-between gap-3">
        {/* Left: Title & Progress */}
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {examTitle}
            </h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>{modeLabel}</span>
              <span>•</span>
              <span>
                Đã làm{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {answeredCount}/{totalQuestions}
                </strong>
              </span>
            </p>
          </div>
        </div>

        {/* Center/Right: Sync Badge, Countdown Timer & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ExamConnectionBadge
            status={syncStatus}
            pendingCount={pendingCount}
            onManualSync={onManualSync}
            isSyncing={syncStatus === "syncing"}
          />

          <ExamCountdownTimer
            expiresAt={expiresAt}
            serverTimeOffsetMs={serverTimeOffsetMs}
            isForceExpired={isForceExpired}
            onExpire={onExpire}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPaletteDrawer}
            aria-label="Mở bảng câu hỏi"
            className="lg:hidden rounded-xl text-xs cursor-pointer"
          >
            <Grid3X3 className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Câu hỏi</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen ? "Thoát toàn màn hình" : "Mở toàn màn hình"
            }
            className="hidden sm:inline-flex rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          {onRequestSubmit && (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || isForceExpired}
              onClick={onRequestSubmit}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Nộp bài</span>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs cursor-pointer"
          >
            <Link href="/exams" aria-label="Tạm rời phòng thi về thư viện">
              <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Thoát</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
