"use client";

import React from "react";
import { Check, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSkills, useToeicParts, useTopics } from "@/hooks/use-classification";
import { QuestionDifficulty } from "@/types/question";

interface TaxonomySelectorProps {
  partId: string;
  onPartIdChange: (partId: string) => void;
  difficulty: QuestionDifficulty;
  onDifficultyChange: (difficulty: QuestionDifficulty) => void;
  selectedTopicIds: string[];
  onTopicToggle: (topicId: string) => void;
  selectedSkillIds: string[];
  onSkillToggle: (skillId: string) => void;
  disabled?: boolean;
  partError?: string;
}

export function TaxonomySelector({
  partId,
  onPartIdChange,
  difficulty,
  onDifficultyChange,
  selectedTopicIds,
  onTopicToggle,
  selectedSkillIds,
  onSkillToggle,
  disabled = false,
  partError,
}: TaxonomySelectorProps) {
  const { data: parts, isLoading: partsLoading } = useToeicParts();
  const { data: topics, isLoading: topicsLoading } = useTopics();
  const { data: skills, isLoading: skillsLoading } = useSkills();

  return (
    <div className="space-y-5 p-5 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Phân loại & Định dạng câu hỏi (Taxonomy)
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOEIC Part Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Phần thi TOEIC (Part) <span className="text-rose-500">*</span>
          </label>
          <Select
            disabled={disabled || partsLoading}
            value={partId || ""}
            onValueChange={onPartIdChange}
          >
            <SelectTrigger
              className={`h-10 rounded-xl bg-white dark:bg-slate-900 ${
                partError ? "border-rose-500 focus-visible:ring-rose-500" : ""
              }`}
            >
              <SelectValue placeholder="Chọn phần thi TOEIC (Part 1–7)" />
            </SelectTrigger>
            <SelectContent>
              {parts?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Part {p.partNumber}: {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {partError && (
            <p className="text-xs text-rose-500 font-medium">{partError}</p>
          )}
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mức độ khó <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "easy", label: "Dễ (Easy)", activeClass: "bg-emerald-600 text-white border-emerald-600" },
              { id: "medium", label: "Trung bình", activeClass: "bg-blue-600 text-white border-blue-600" },
              { id: "hard", label: "Khó (Hard)", activeClass: "bg-purple-600 text-white border-purple-600" },
            ].map((d) => {
              const isSelected = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDifficultyChange(d.id as QuestionDifficulty)}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                    isSelected
                      ? `${d.activeClass} shadow-sm`
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Topics Multi-select Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Chủ đề liên quan (Topics)
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedTopicIds.length} đã chọn
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topicsLoading ? (
            <span className="text-xs text-slate-400">Đang tải danh mục chủ đề...</span>
          ) : topics && topics.length > 0 ? (
            topics.map((t) => {
              const isSelected = selectedTopicIds.includes(t.id);
              return (
                <Badge
                  key={t.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => !disabled && onTopicToggle(t.id)}
                  className={`cursor-pointer text-xs py-1 px-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {isSelected && <Check className="w-3 h-3 mr-1" />}
                  {t.name}
                </Badge>
              );
            })
          ) : (
            <span className="text-xs text-slate-400">Chưa có chủ đề nào</span>
          )}
        </div>
      </div>

      {/* Skills Multi-select Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kỹ năng rèn luyện (Skills)
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedSkillIds.length} đã chọn
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skillsLoading ? (
            <span className="text-xs text-slate-400">Đang tải danh mục kỹ năng...</span>
          ) : skills && skills.length > 0 ? (
            skills.map((s) => {
              const isSelected = selectedSkillIds.includes(s.id);
              return (
                <Badge
                  key={s.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => !disabled && onSkillToggle(s.id)}
                  className={`cursor-pointer text-xs py-1 px-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {isSelected && <Check className="w-3 h-3 mr-1" />}
                  {s.name}
                </Badge>
              );
            })
          ) : (
            <span className="text-xs text-slate-400">Chưa có kỹ năng nào</span>
          )}
        </div>
      </div>
    </div>
  );
}
