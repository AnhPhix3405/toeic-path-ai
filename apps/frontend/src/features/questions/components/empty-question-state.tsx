import React from "react";
import Link from "next/link";
import { HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyQuestionStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
}

export function EmptyQuestionState({
  hasFilters,
  onResetFilters,
}: EmptyQuestionStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
        <HelpCircle className="w-7 h-7" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {hasFilters
          ? "Không tìm thấy câu hỏi phù hợp"
          : "Ngân hàng câu hỏi hiện đang trống"}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {hasFilters
          ? "Hãy thử thay đổi điều kiện tìm kiếm, chọn Part khác hoặc xóa bộ lọc để xem toàn bộ danh sách."
          : "Bắt đầu tạo câu hỏi trắc nghiệm TOEIC mới để phân loại và đưa vào đề thi."}
      </p>

      {hasFilters ? (
        <Button variant="outline" onClick={onResetFilters}>
          Xóa toàn bộ bộ lọc
        </Button>
      ) : (
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Link href="/questions/create">
            <Plus className="w-4 h-4 mr-2" />
            Tạo câu hỏi đầu tiên
          </Link>
        </Button>
      )}
    </div>
  );
}
