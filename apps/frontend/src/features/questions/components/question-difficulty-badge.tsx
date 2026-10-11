import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuestionDifficulty } from "@/types/question";

interface QuestionDifficultyBadgeProps {
  difficulty: QuestionDifficulty | null;
  className?: string;
}

const difficultyConfig: Record<
  QuestionDifficulty,
  { label: string; colorClass: string }
> = {
  easy: {
    label: "Dễ",
    colorClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
  },
  medium: {
    label: "Trung bình",
    colorClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800",
  },
  hard: {
    label: "Khó",
    colorClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-300 dark:border-purple-800",
  },
};

export function QuestionDifficultyBadge({
  difficulty,
  className,
}: QuestionDifficultyBadgeProps) {
  if (!difficulty) {
    return (
      <Badge
        variant="outline"
        className={`bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 ${className || ""}`}
      >
        Chưa phân loại
      </Badge>
    );
  }

  const config = difficultyConfig[difficulty] || difficultyConfig.medium;

  return (
    <Badge
      variant="outline"
      className={`font-medium border ${config.colorClass} ${className || ""}`}
    >
      {config.label}
    </Badge>
  );
}
