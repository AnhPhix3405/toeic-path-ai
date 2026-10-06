import Link from "next/link";
import { Shield, Activity, Users, Cpu, Sliders } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
            <Shield className="h-3.5 w-3.5" /> Quản trị viên Toàn quyền
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hệ thống Quản trị & Điều hành</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Giám sát tài nguyên, quản lý phân quyền RBAC và theo dõi mức tiêu thụ AI Token.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ai-settings"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Sliders className="h-4 w-4" /> Cấu hình AI Gateway
          </Link>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng người dùng</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">1,840</div>
          <p className="text-xs text-muted-foreground">1,720 Students, 95 Teachers, 25 Admins</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Token Đã Dùng</span>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">2.4M</div>
          <p className="text-xs text-muted-foreground">Chi phí ước tính: $4.80 / 30 ngày</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Trạng thái API Backend</span>
            <Activity className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">99.98%</div>
          <p className="text-xs text-muted-foreground">Response time TB: 64ms</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Sự kiện bảo mật</span>
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">0 Cảnh báo</div>
          <p className="text-xs text-muted-foreground">Audit log ghi nhận bình thường</p>
        </div>
      </div>
    </div>
  );
}
