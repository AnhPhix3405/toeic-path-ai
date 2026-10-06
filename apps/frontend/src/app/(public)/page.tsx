import Link from "next/link";
import { Sparkles, BookOpen, Target, ArrowRight, CheckCircle, ShieldCheck, Zap } from "lucide-react";

export default function PublicLandingPage() {
  return (
    <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Nền tảng luyện thi TOEIC thích ứng AI thế hệ mới
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl max-w-4xl mx-auto">
          Chinh phục mục tiêu TOEIC với <span className="text-primary">Lộ trình thích ứng</span> và Trợ giảng AI
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
          Đánh giá chính xác điểm mạnh - điểm yếu qua từng câu hỏi, tự động đề xuất bài tập tối ưu và giải thích chi tiết
          từng đáp án 24/7 với AI Tutor.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Bắt đầu thi thử miễn phí <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/exams"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-input bg-card px-6 py-3 text-base font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <BookOpen className="h-4 w-4" /> Khám phá ngân hàng đề thi
          </Link>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Lộ trình học cá nhân hóa</h2>
          <p className="text-sm text-muted-foreground">
            Thuật toán học tập thích ứng phân tích xác suất trả lời đúng, tập trung vào lỗ hổng kiến thức để tăng điểm nhanh nhất.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Zap className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Phòng thi mô phỏng thật</h2>
          <p className="text-sm text-muted-foreground">
            Giao diện 200 câu thi thật, bộ đếm giờ countdown, cơ chế auto-save và đồng bộ liên tục chống mất bài làm.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold">Trợ giảng AI trực tuyến</h2>
          <p className="text-sm text-muted-foreground">
            Giải thích chuyên sâu ngữ pháp, từ vựng và bẫy đề thi theo thời gian thực cho từng câu bạn làm sai.
          </p>
        </div>
      </section>

      {/* Feature List & Trust */}
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-center">Tại sao học viên lựa chọn TOEIC Path AI?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <span>Đầy đủ 7 Parts chuẩn format ETS</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <span>Audio chất lượng cao có transcript</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <span>Chấm điểm tức thì & radar kỹ năng</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Tự động lưu bài khi rớt mạng</span>
          </div>
        </div>
      </section>
    </div>
  );
}
