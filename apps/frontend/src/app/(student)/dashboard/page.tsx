import Link from "next/link";
import { Sparkles, Target, BookOpen, Flame, ArrowRight, Clock, Award } from "lucide-react";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Chào mừng trở lại, Nguyễn Văn A
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Lộ trình chinh phục TOEIC 750+
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Bạn đã hoàn thành <strong>68%</strong> mục tiêu tuần này. Tiếp tục duy trì chuỗi học tập để đạt kết quả tốt nhất!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Luyện tập thích ứng <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/exams"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Làm bài thi thử
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Điểm ước tính</span>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">620 <span className="text-xs font-normal text-muted-foreground">/ 990</span></div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+45 điểm so với đầu vào</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Chuỗi ngày học</span>
            <Flame className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-foreground">7 ngày liên tiếp</div>
          <p className="text-xs text-muted-foreground">Mục tiêu: 14 ngày</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Câu hỏi đã làm</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">342 câu</div>
          <p className="text-xs text-muted-foreground">Độ chính xác: 74.2%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời gian ôn tập</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">14.5 giờ</div>
          <p className="text-xs text-muted-foreground">3.2 giờ trong tuần này</p>
        </div>
      </div>
    </div>
  );
}
