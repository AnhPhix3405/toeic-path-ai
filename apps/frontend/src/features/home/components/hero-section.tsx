"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Layers,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PublicLandingStats } from "@/types/exam";

interface HeroSectionProps {
  stats?: PublicLandingStats;
  isLoading?: boolean;
}

export function HeroSection({ stats, isLoading = false }: HeroSectionProps) {
  const examsCount = stats?.publishedExamsCount ?? 0;
  const questionsCount = stats?.publishedQuestionsCount ?? 0;
  const attemptsCount = stats?.completedAttemptsCount ?? 0;

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
              Luyện thi TOEIC trực tuyến · Phù hợp cho mọi trình độ
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:leading-[1.15]">
              Chinh phục{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-emerald-400">
                điểm số TOEIC mục tiêu
              </span>{" "}
              theo nhịp độ của riêng bạn
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Dù bạn đang bắt đầu lấy lại căn bản, cần chứng chỉ xét tốt nghiệp
              hay hướng tới mức điểm cao cho công việc quốc tế — kho đề thi
              chuẩn ETS cùng lời giải chi tiết luôn sẵn sàng đồng hành cùng bạn.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button asChild size="lg" className="gap-2 font-semibold shadow-sm">
                <Link href="/exams">
                  Bắt đầu thi thử ngay <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="font-semibold"
              >
                <a href="#featured-exams">Xem đề thi nổi bật</a>
              </Button>
            </div>

            {/* Learner-Centric Trust Highlights */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Thi Full Test 120 phút hoặc luyện riêng từng Part
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Tự động lưu bài làm khi gián đoạn mạng
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Chấm điểm & xem giải thích chi tiết tức thì
              </span>
            </div>
          </div>

          {/* Right Column: Visual Proof — Mock Exam Room & ETS Score Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-border bg-card p-5 shadow-xl">
              {/* Top Bar of Mock Exam Room */}
              <div className="flex items-center justify-between border-b border-border pb-3.5">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[11px]">
                    Part 5 · Hoàn thành câu
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    Câu 101 / 200
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  74:20
                </div>
              </div>

              {/* Audio & Sample Question */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Trình phát âm thanh bài nghe · 1.0x
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ● Đã lưu bài làm
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5">
                  <p className="text-xs font-medium leading-relaxed text-foreground">
                    101. The quarterly financial report must be reviewed{" "}
                    <span className="font-bold text-primary">_______</span>{" "}
                    before being submitted to the board of directors.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border px-2.5 py-1.5 text-muted-foreground">
                      (A) thorough
                    </div>
                    <div className="rounded-md border-2 border-primary bg-primary/10 px-2.5 py-1.5 font-semibold text-primary">
                      (B) thoroughly ✓
                    </div>
                    <div className="rounded-md border border-border px-2.5 py-1.5 text-muted-foreground">
                      (C) thoroughness
                    </div>
                    <div className="rounded-md border border-border px-2.5 py-1.5 text-muted-foreground">
                      (D) more thorough
                    </div>
                  </div>
                </div>
              </div>

              {/* ETS Score Report Mini Card */}
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Kết quả chấm điểm tự động
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      Listening 345 · Reading 320
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      665
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / 990
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Platform Pulse Bar */}
        <div
          className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card/90 p-5 shadow-sm sm:grid-cols-4"
          aria-label="Số liệu thống kê nền tảng"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">
                {isLoading
                  ? "..."
                  : examsCount > 0
                    ? `${examsCount}+`
                    : "Chuẩn ETS"}
              </p>
              <p className="text-xs text-muted-foreground">
                Đề thi đang mở công khai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">
                {isLoading
                  ? "..."
                  : questionsCount > 0
                    ? `${questionsCount}+`
                    : "Đa dạng"}
              </p>
              <p className="text-xs text-muted-foreground">
                Câu hỏi đã biên soạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">
                Nghe & Đọc
              </p>
              <p className="text-xs text-muted-foreground">
                Giao diện luyện thi đồng bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {attemptsCount >= 5 ? (
                <Award className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">
                {isLoading
                  ? "..."
                  : attemptsCount >= 5
                    ? `${attemptsCount}+`
                    : "ETS 10–990"}
              </p>
              <p className="text-xs text-muted-foreground">
                {attemptsCount >= 5
                  ? "Lượt làm bài hoàn thành"
                  : "Thang chấm điểm chuẩn"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
