"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { ExamAttemptHistoryItem } from "@/types/exam-attempt";
import { cn } from "@/lib/utils";

export interface ScoreTrendChartProps {
  items: ExamAttemptHistoryItem[];
}

type TrendMetric = "score" | "accuracy";

export function ScoreTrendChart({ items }: ScoreTrendChartProps) {
  const [metric, setMetric] = useState<TrendMetric>("score");

  // PMR 033 #4: Filter graded attempts and sort by submittedAt ASC (oldest -> newest)
  const chronologicalGraded = useMemo(() => {
    return items
      .filter(
        (item) =>
          (item.status === "submitted" || item.status === "timed_out") &&
          Boolean(item.submittedAt)
      )
      .sort(
        (a, b) =>
          new Date(a.submittedAt || a.startedAt).getTime() -
          new Date(b.submittedAt || b.startedAt).getTime()
      );
  }, [items]);

  const etsPoints = useMemo(
    () =>
      chronologicalGraded
        .filter((item) => item.totalScore !== null)
        .map((item, idx) => ({
          label: new Date(item.submittedAt || item.startedAt).toLocaleDateString(
            "vi-VN",
            { day: "2-digit", month: "2-digit" }
          ),
          attemptIndex: idx + 1,
          examTitle: item.examTitle,
          value: item.totalScore as number,
        })),
    [chronologicalGraded]
  );

  const accuracyPoints = useMemo(
    () =>
      chronologicalGraded
        .filter((item) => item.accuracyPercentage !== null)
        .map((item, idx) => ({
          label: new Date(item.submittedAt || item.startedAt).toLocaleDateString(
            "vi-VN",
            { day: "2-digit", month: "2-digit" }
          ),
          attemptIndex: idx + 1,
          examTitle: item.examTitle,
          value: Number(Number(item.accuracyPercentage ?? 0).toFixed(1)),
        })),
    [chronologicalGraded]
  );

  // PMR 033 #4: Strictly separate 0-990 ETS score axis from 0-100% accuracy axis
  const activePoints = metric === "score" ? etsPoints : accuracyPoints;
  const yDomain: [number, number] = metric === "score" ? [0, 990] : [0, 100];
  const yUnit = metric === "score" ? "" : "%";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Tiến trình cải thiện điểm số
          </h2>
        </div>

        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5">
          <button
            type="button"
            onClick={() => setMetric("score")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              metric === "score"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Điểm TOEIC (0–990)
          </button>
          <button
            type="button"
            onClick={() => setMetric("accuracy")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              metric === "accuracy"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Độ chính xác (%)
          </button>
        </div>
      </div>

      {activePoints.length < 2 ? (
        <p className="text-xs text-slate-500 text-center py-8">
          {metric === "score"
            ? "Cần tối thiểu 2 bài thi có điểm quy đổi TOEIC (10–990) để hiển thị biểu đồ tiến trình."
            : "Cần tối thiểu 2 bài thi đã hoàn thành để hiển thị biểu đồ xu hướng độ chính xác."}
        </p>
      ) : (
        <div className="w-full h-56 min-h-[210px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={200}>
            <AreaChart
              data={activePoints}
              margin={{ top: 8, right: 16, left: -10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={yDomain} tick={{ fontSize: 11 }} unit={yUnit} />
              <Tooltip
                formatter={(val: unknown) => [
                  metric === "score" ? `${val} / 990` : `${val}%`,
                  metric === "score" ? "Tổng điểm" : "Độ chính xác",
                ]}
                contentStyle={{
                  borderRadius: "12px",
                  borderColor: "#e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fill="url(#scoreTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
