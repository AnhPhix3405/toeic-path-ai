"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { PartBreakdownItem } from "@/types/exam-attempt";

export interface PartBreakdownChartProps {
  partBreakdown: PartBreakdownItem[];
}

export function PartBreakdownChart({ partBreakdown }: PartBreakdownChartProps) {
  if (!partBreakdown || partBreakdown.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Phân tích theo từng Part TOEIC
          </h2>
        </div>
        <p className="text-xs text-slate-500 py-8 text-center">
          Chưa có dữ liệu phân tích theo từng Part cho lượt thi này.
        </p>
      </div>
    );
  }

  const chartData = partBreakdown.map((item) => ({
    ...item,
    name: `Part ${item.partNumber}`,
    accuracyRounded: Number(Number(item.accuracy ?? 0).toFixed(1)),
  }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Phân tích độ chính xác theo Part (1–7)
          </h2>
        </div>
        <span className="text-[11px] text-slate-500">Đơn vị: % câu đúng</span>
      </div>

      <div className="w-full h-64 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(value: unknown) => [`${value}%`, "Độ chính xác"]}
              contentStyle={{
                borderRadius: "12px",
                borderColor: "#e2e8f0",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="accuracyRounded"
              fill="#4f46e5"
              radius={[8, 8, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Breakdown Summary Table */}
      <div className="overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <th className="py-2 font-semibold">Phần thi</th>
              <th className="py-2 font-semibold text-center">Đúng / Tổng</th>
              <th className="py-2 font-semibold text-center">Sai</th>
              <th className="py-2 font-semibold text-center">Bỏ qua</th>
              <th className="py-2 font-semibold text-right">TB / câu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {chartData.map((row) => (
              <tr key={row.partNumber}>
                <td className="py-2 font-semibold text-slate-800 dark:text-slate-200">
                  {row.name}
                </td>
                <td className="py-2 text-center font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  {row.correct}/{row.total} ({row.accuracyRounded}%)
                </td>
                <td className="py-2 text-center font-mono text-rose-600 dark:text-rose-400">
                  {row.wrong}
                </td>
                <td className="py-2 text-center font-mono text-slate-500">
                  {row.skipped}
                </td>
                <td className="py-2 text-right font-mono text-slate-500">
                  {row.avgTimeSeconds}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
