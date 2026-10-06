import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BookOpen, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">TOEIC Path AI</span>
              <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Design System v1.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {/* Intro Hero Section */}
        <section className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Design Tokens & UI Foundation
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Hệ thống Design System của nền tảng <strong>TOEIC Path AI</strong> được thiết kế theo tiêu chuẩn
            UI/UX công nghiệp, đảm bảo độ tương phản <strong>WCAG 2.1 AA</strong>, chuyển đổi Dark/Light mode không
            giật nháy và tối ưu trải nghiệm học tập thích ứng.
          </p>
        </section>

        {/* Color Palette Tokens Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">1. Semantic Color Tokens</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Primary */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-primary mb-3 shadow-inner flex items-center justify-center text-primary-foreground text-xs font-semibold">
                Primary
              </div>
              <div className="text-sm font-semibold">Brand Primary</div>
              <div className="text-xs text-muted-foreground">#2563EB / Blue</div>
            </div>

            {/* Secondary */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-secondary mb-3 shadow-inner flex items-center justify-center text-secondary-foreground text-xs font-semibold">
                Secondary
              </div>
              <div className="text-sm font-semibold">Secondary</div>
              <div className="text-xs text-muted-foreground">Slate / Neutral</div>
            </div>

            {/* Success */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-success mb-3 shadow-inner flex items-center justify-center text-success-foreground text-xs font-semibold">
                Success
              </div>
              <div className="text-sm font-semibold">Correct Answer</div>
              <div className="text-xs text-muted-foreground">#10B981 / Emerald</div>
            </div>

            {/* Warning */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-warning mb-3 shadow-inner flex items-center justify-center text-warning-foreground text-xs font-semibold">
                Warning
              </div>
              <div className="text-sm font-semibold">Flagged / Alert</div>
              <div className="text-xs text-muted-foreground">#F59E0B / Amber</div>
            </div>

            {/* Destructive */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-destructive mb-3 shadow-inner flex items-center justify-center text-destructive-foreground text-xs font-semibold">
                Destructive
              </div>
              <div className="text-sm font-semibold">Incorrect / Error</div>
              <div className="text-xs text-muted-foreground">#EF4444 / Rose</div>
            </div>

            {/* Muted */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="h-10 w-full rounded-md bg-muted mb-3 shadow-inner flex items-center justify-center text-muted-foreground text-xs font-semibold">
                Muted
              </div>
              <div className="text-sm font-semibold">Muted Surface</div>
              <div className="text-xs text-muted-foreground">Subtle Border & BG</div>
            </div>
          </div>
        </section>

        {/* Typography & Spacing Hierarchy */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">2. Typography & Hierarchy Scale</h2>
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">H1 — Page Heading (32px / 36px)</span>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Luyện thi TOEIC Thích ứng Thông minh</h1>
            </div>
            <div className="border-t border-border pt-4">
              <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">H2 — Section Heading (24px)</span>
              <h2 className="text-xl font-bold tracking-tight">Hồ sơ năng lực & Phân tích điểm yếu</h2>
            </div>
            <div className="border-t border-border pt-4">
              <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">H3 — Card Title (18px)</span>
              <h3 className="text-lg font-semibold">Part 5: Incomplete Sentences — Ngữ pháp & Từ vựng</h3>
            </div>
            <div className="border-t border-border pt-4">
              <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Body Regular (16px / 14px)</span>
              <p className="text-sm sm:text-base text-foreground">
                Hệ thống tự động đề xuất các câu hỏi luyện tập dựa trên phân bố câu hỏi bạn làm sai gần nhất, tối ưu thời gian ôn luyện.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Controls & States */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">3. Button & Interactive Control States</h2>
          <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <BookOpen className="h-4 w-4" /> Bắt đầu bài thi
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Xem báo cáo
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Đánh dấu xem lại
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Nộp bài thi
            </button>
            <button disabled className="inline-flex items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              Nút vô hiệu hóa
            </button>
          </div>
        </section>

        {/* Real-World Context: Sample TOEIC Question Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">4. Real-world Component: TOEIC Question Card</h2>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Question 101
                </span>
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Part 5 — Incomplete Sentences
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>Verified Quality</span>
              </div>
            </div>

            <div className="text-base font-medium leading-relaxed">
              Customer satisfaction surveys indicate that the new online ordering system is ______ more efficient than the previous version.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-input p-3.5 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <input type="radio" name="sample-q" className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">(A) consider</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-primary bg-primary/5 p-3.5 transition-colors cursor-pointer">
                <input type="radio" name="sample-q" defaultChecked className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm font-medium text-primary font-semibold">(B) considerably</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-input p-3.5 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <input type="radio" name="sample-q" className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">(C) consideration</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-input p-3.5 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <input type="radio" name="sample-q" className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">(D) considerate</span>
              </label>
            </div>

            <div className="rounded-md bg-muted/50 p-4 border border-border/50 text-sm space-y-1">
              <div className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Đáp án chính xác: (B) considerably
              </div>
              <p className="text-xs text-muted-foreground">
                Giải thích: Cần một trạng từ (adverb) bổ nghĩa cho tính từ so sánh hơn &quot;more efficient&quot;. &quot;Considerably&quot; mang nghĩa &quot;đáng kể&quot;.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
