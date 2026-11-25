"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamAttemptResult } from "@/types/exam-attempt";
import { ScoreHeroCard } from "./score-hero-card";
import { PartBreakdownChart } from "./part-breakdown-chart";
import { SkillBreakdownChart } from "./skill-breakdown-chart";

export interface ScoreReportViewProps {
  result: ExamAttemptResult;
  attemptSlugOrId: string;
}

export function ScoreReportView({
  result,
  attemptSlugOrId,
}: ScoreReportViewProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
          <Link href="/results">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Lịch sử &amp; Điểm số
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            <Link href="/exams">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Thư viện đề thi
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            <Link href="/results">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Lịch sử thi
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Link href={`/exam-attempts/${attemptSlugOrId}/review`}>
              <BookOpenCheck className="w-3.5 h-3.5 mr-1.5" />
              Xem lại đáp án &amp; Lời giải chi tiết
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero Score & Stats Card */}
      <ScoreHeroCard result={result} />

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PartBreakdownChart partBreakdown={result.partBreakdown} />
        <SkillBreakdownChart skillBreakdown={result.skillBreakdown} />
      </div>
    </div>
  );
}
