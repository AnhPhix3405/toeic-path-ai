"use client";

import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Target } from "lucide-react";
import { SkillBreakdownItem } from "@/types/exam-attempt";

export interface SkillBreakdownChartProps {
  skillBreakdown: SkillBreakdownItem[];
}

export function SkillBreakdownChart({
  skillBreakdown,
}: SkillBreakdownChartProps) {
  if (!skillBreakdown || skillBreakdown.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Phân tích năng lực theo Kỹ năng
          </h2>
        </div>
        <p className="text-xs text-slate-500 py-8 text-center">
          Các câu hỏi trong lượt thi này chưa được gắn nhãn kỹ năng chi tiết.
        </p>
      </div>
    );
  }

  const chartData = skillBreakdown.map((item) => ({
    ...item,
    accuracyRounded: Number(Number(item.accuracy ?? 0).toFixed(1)),
  }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Phân tích năng lực theo Kỹ năng ({chartData.length})
          </h2>
        </div>
        <span className="text-[11px] text-slate-500">Độ chính xác (%)</span>
      </div>

      {chartData.length >= 3 && (
        <div className="w-full h-64 min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="skillName" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: unknown) => [`${value}%`, "Độ chính xác"]}
                contentStyle={{
                  borderRadius: "12px",
                  borderColor: "#e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Radar
                name="Độ chính xác"
                dataKey="accuracyRounded"
                stroke="#4f46e5"
                fill="#6366f1"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skill Progress Bars */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {chartData.map((skill) => (
          <div key={skill.skillId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {skill.skillName}
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400 shrink-0 ml-2">
                {skill.correct}/{skill.total} ({skill.accuracyRounded}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, skill.accuracyRounded))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
