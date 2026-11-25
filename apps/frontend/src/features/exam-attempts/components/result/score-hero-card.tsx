"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Headphones,
  HelpCircle,
  BookOpen,
  Trophy,
  XCircle,
} from "lucide-react";
import { ExamAttemptResult } from "@/types/exam-attempt";
import { formatDurationSpent } from "@/lib/validations/exam-attempt.schema";
import { ScorePassBadge } from "./score-pass-badge";

export interface ScoreHeroCardProps {
  result: ExamAttemptResult;
}

export function ScoreHeroCard({ result }: ScoreHeroCardProps) {
  const hasEtsTotal = result.totalScore !== null && result.totalScore !== undefined;
  const accuracyText = `${Number(result.accuracyPercentage ?? 0).toFixed(1)}%`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 border border-white/20">
                {result.mode === "part_practice"
                  ? `Luyện Part ${(result.selectedParts || []).join(", ")}`
                  : "Full Exam"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 border border-white/20">
                {result.status === "timed_out"
                  ? "Hết giờ (Tự động chốt)"
                  : "Đã nộp bài"}
              </span>
              <ScorePassBadge isPassed={result.isPassed} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold leading-snug">
              {result.examTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-100">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Thời gian làm bài: {formatDurationSpent(result.durationSpentSeconds)}
              </span>
              {result.passingScore !== null && (
                <span>Điểm chuẩn đạt: {result.passingScore}</span>
              )}
            </div>
          </div>

          {/* Primary Score Display (Handles ETS 10-990 AND nullable RAW/PartPractice/1-skill cleanly) */}
          <div className="shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-6 py-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              {hasEtsTotal ? (
                <>
                  <p className="text-[11px] uppercase tracking-wider text-indigo-100 font-semibold">
                    Tổng điểm TOEIC
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold font-mono leading-none mt-1">
                    {result.totalScore}
                    <span className="text-base font-normal text-indigo-200">
                      {" "}
                      / 990
                    </span>
                  </p>
                  <p className="text-xs text-indigo-100 mt-1">
                    Độ chính xác: <strong>{accuracyText}</strong>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-wider text-indigo-100 font-semibold">
                    Tỷ lệ chính xác
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold font-mono leading-none mt-1">
                    {accuracyText}
                  </p>
                  <p className="text-xs text-indigo-100 mt-1">
                    {result.correctCount}/{result.totalQuestions} câu đúng
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Scores (Listening / Reading) + Answer Breakdown Strip */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Headphones className="w-3.5 h-3.5 text-indigo-500" />
            Listening
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {result.listeningScore !== null ? (
              <>
                {result.listeningScore}
                <span className="text-xs font-normal text-slate-400"> / 495</span>
              </>
            ) : (
              <span className="text-sm font-sans font-medium text-slate-400">
                Không áp dụng
              </span>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            Reading
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {result.readingScore !== null ? (
              <>
                {result.readingScore}
                <span className="text-xs font-normal text-slate-400"> / 495</span>
              </>
            ) : (
              <span className="text-sm font-sans font-medium text-slate-400">
                Không áp dụng
              </span>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Trả lời đúng
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {result.correctCount}
            <span className="text-xs font-normal text-emerald-600/70">
              {" "}
              / {result.totalQuestions}
            </span>
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            Trả lời sai
          </div>
          <p className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
            {result.wrongCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" />
            Bỏ trống
          </div>
          <p className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">
            {result.skippedCount}
          </p>
        </div>
      </div>
    </div>
  );
}
