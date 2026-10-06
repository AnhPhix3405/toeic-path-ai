import Link from "next/link";
import { Users, FileText, CheckSquare, Sparkles, Plus, ArrowRight } from "lucide-react";

export default function TeacherDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Không gian Giảng viên</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý ngân hàng câu hỏi, tổ chức đề thi và thẩm định nội dung học thuật TOEIC.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/questions/create"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Tạo câu hỏi mới
          </Link>
          <Link
            href="/ai-studio"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Sparkles className="h-4 w-4 text-primary" /> AI Studio
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng câu hỏi</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">1,480</div>
          <p className="text-xs text-muted-foreground">1,350 đã xuất bản</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Chờ kiểm duyệt</span>
            <CheckSquare className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">18 câu</div>
          <p className="text-xs text-muted-foreground">Yêu cầu thẩm định Maker-Checker</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Học viên hoạt động</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">324</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+18 học viên tuần này</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Đề thi đang mở</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">12 đề</div>
          <p className="text-xs text-muted-foreground">8 Full Test, 4 Mini Test</p>
        </div>
      </div>
    </div>
  );
}
