"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileQuestion,
  Layers,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamTypeBadge } from "@/features/exams/components/exam-badges";
import type { ExamCatalogItem, ExamType } from "@/types/exam";

interface FeaturedExamsSectionProps {
  exams: ExamCatalogItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRefresh: () => void;
}

type FilterTab = "all" | ExamType;

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "Tất cả đề thi" },
  { id: "full_test", label: "Full Test (200 câu)" },
  { id: "mini_test", label: "Mini Test" },
  { id: "placement_test", label: "Placement Test" },
];

export function FeaturedExamsSection({
  exams,
  isLoading,
  isFetching,
  isError,
  onRefresh,
}: FeaturedExamsSectionProps) {
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");

  const filteredExams = React.useMemo(() => {
    if (activeTab === "all") return exams;
    return exams.filter((exam) => exam.type === activeTab);
  }, [exams, activeTab]);

  return (
    <section
      id="featured-exams"
      className="scroll-mt-24 border-b border-border bg-background py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Đang hoạt động · Dữ liệu thời gian thực
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Đề Thi TOEIC Nổi Bật
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Trải nghiệm ngay các đề thi đã xuất bản. Khách vãng lai có thể xem
              cấu trúc chi tiết từng Part trước khi bắt đầu làm bài.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Làm mới danh sách đề thi nổi bật"
              className="gap-1.5"
            >
              <RefreshCcw
                className={
                  isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              Làm mới
            </Button>
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <Link href="/exams">
                Xem toàn bộ kho đề <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* ARIA Filter Tabs (PMR #7) */}
        <div
          role="tablist"
          aria-label="Lọc đề thi nổi bật theo loại đề"
          className="flex flex-wrap gap-2"
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-controls="featured-exams-tabpanel"
                onClick={() => setActiveTab(tab.id)}
                className={
                  isSelected
                    ? "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors"
                    : "rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div
          id="featured-exams-tabpanel"
          role="tabpanel"
          aria-live="polite"
        >
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 space-y-4">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-full mt-2" />
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="border-dashed p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Không thể tải danh sách đề thi nổi bật lúc này
              </p>
              <p className="text-xs text-muted-foreground">
                Bạn vẫn có thể truy cập trực tiếp kho đề thi công khai hoặc bấm
                thử lại.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  Thử lại
                </Button>
                <Button asChild size="sm">
                  <Link href="/exams">Mở kho đề thi</Link>
                </Button>
              </div>
            </Card>
          ) : filteredExams.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Chưa có đề thi thuộc nhóm này trong danh sách nổi bật
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Hãy mở toàn bộ kho đề thi để tìm kiếm và lọc đầy đủ các đề thi
                đã xuất bản trên hệ thống.
              </p>
              <div className="pt-2">
                <Button asChild size="sm">
                  <Link
                    href={
                      activeTab === "all"
                        ? "/exams"
                        : `/exams?type=${activeTab}`
                    }
                  >
                    Khám phá toàn bộ kho đề thi <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const identifier = exam.slug || exam.id;
                const overviewHref = `/exams/${identifier}`;
                return (
                  <Card
                    key={exam.id}
                    className="group flex flex-col justify-between border-border transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ExamTypeBadge type={exam.type} />
                        {exam.allowPartPractice && (
                          <Badge variant="outline" className="text-[11px]">
                            Hỗ trợ luyện từng Part
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                        {exam.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {exam.description ||
                          "Đề thi TOEIC chuẩn cấu trúc ETS với chế độ bấm giờ và chấm điểm tự động."}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {exam.durationMinutes} phút
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <FileQuestion className="h-3.5 w-3.5 text-primary" />
                          {exam.totalQuestions} câu hỏi
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          {exam.totalAttempts ?? 0} lượt thi
                        </span>
                      </div>

                      {/* Links to Public Overview /exams/:slug per PMR #2 */}
                      <Button asChild className="w-full gap-1.5">
                        <Link href={overviewHref}>
                          Xem cấu trúc & Làm bài{" "}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
