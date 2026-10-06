import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Shield,
  ArrowRight,
  Layers,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200 pb-16">
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
                Design System & Core Layouts v1.0
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
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Layers className="h-3.5 w-3.5" /> Sprint 1 Frontend Complete
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hệ thống Core Layouts & Điều hướng Thông minh
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Hệ thống giao diện của <strong>TOEIC Path AI</strong> được thiết kế theo tiêu chuẩn
            UI/UX Pro, phân chia rõ ràng giữa giao diện <strong>Public</strong> và các không gian làm việc
            chuyên biệt cho <strong>Học viên (Student)</strong>, <strong>Giảng viên (Teacher)</strong>, và <strong>Quản trị viên (Admin)</strong>.
          </p>
        </section>

        {/* Live Layout Navigation Previews */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">1. Trải nghiệm Trực tiếp các Không gian Layout</h2>
            <span className="text-xs text-muted-foreground">Chọn vai trò để xem giao diện Shell tương ứng</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Workspace */}
            <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Student Role
                  </span>
                </div>
                <h3 className="text-lg font-bold">Không gian Học viên</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sidebar điều hướng học tập: Luyện thi TOEIC, Luyện tập thích ứng, Lộ trình cá nhân, Trợ giảng AI và Báo cáo điểm số.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-between rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <span>Mở Student Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Teacher Workspace */}
            <div className="rounded-xl border border-emerald-500/30 bg-card p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Teacher Role
                  </span>
                </div>
                <h3 className="text-lg font-bold">Không gian Giảng viên</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sidebar quản lý đào tạo: Ngân hàng câu hỏi, Nhóm câu hỏi (Passage), Quản lý đề thi, Kiểm duyệt Maker-Checker và AI Studio.
                </p>
              </div>
              <Link
                href="/teacher-dashboard"
                className="inline-flex items-center justify-between rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <span>Mở Teacher Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Admin Workspace */}
            <div className="rounded-xl border border-amber-500/30 bg-card p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Admin Role
                  </span>
                </div>
                <h3 className="text-lg font-bold">Không gian Quản trị viên</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sidebar quản trị toàn diện: Quản lý người dùng, Phân quyền vai trò, Cấu hình AI Token Gateway và Nhật ký hệ thống Audit Logs.
                </p>
              </div>
              <Link
                href="/admin-dashboard"
                className="inline-flex items-center justify-between rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
              >
                <span>Mở Admin Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Color Palette Tokens Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">2. Semantic Color Tokens & WCAG AA Contrast</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-primary mb-3 shadow-inner flex items-center justify-center text-primary-foreground text-xs font-semibold">
                Primary
              </div>
              <div className="text-sm font-semibold">Brand Primary</div>
              <div className="text-xs text-muted-foreground">#2563EB / Blue</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-secondary mb-3 shadow-inner flex items-center justify-center text-secondary-foreground text-xs font-semibold">
                Secondary
              </div>
              <div className="text-sm font-semibold">Secondary</div>
              <div className="text-xs text-muted-foreground">Slate / Neutral</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-success mb-3 shadow-inner flex items-center justify-center text-success-foreground text-xs font-semibold">
                Success
              </div>
              <div className="text-sm font-semibold">Correct Answer</div>
              <div className="text-xs text-muted-foreground">#10B981 / Emerald</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-warning mb-3 shadow-inner flex items-center justify-center text-warning-foreground text-xs font-semibold">
                Warning
              </div>
              <div className="text-sm font-semibold">Flagged / Alert</div>
              <div className="text-xs text-muted-foreground">#F59E0B / Amber</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-destructive mb-3 shadow-inner flex items-center justify-center text-destructive-foreground text-xs font-semibold">
                Destructive
              </div>
              <div className="text-sm font-semibold">Incorrect / Error</div>
              <div className="text-xs text-muted-foreground">#EF4444 / Rose</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="h-10 w-full rounded-md bg-muted mb-3 shadow-inner flex items-center justify-center text-muted-foreground text-xs font-semibold">
                Muted
              </div>
              <div className="text-sm font-semibold">Muted Surface</div>
              <div className="text-xs text-muted-foreground">Subtle Border & BG</div>
            </div>
          </div>
        </section>

        {/* Real-World Context: Sample TOEIC Question Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">3. Component Mẫu: TOEIC Question Card</h2>
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-6">
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
