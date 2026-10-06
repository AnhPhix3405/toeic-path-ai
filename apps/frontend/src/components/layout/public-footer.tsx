import Link from "next/link";
import { Sparkles, Shield, Heart } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column (2 cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-extrabold">TOEIC Path AI</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Nền tảng luyện thi TOEIC trực tuyến ứng dụng Trí tuệ Nhân tạo và Học tập Thích ứng (Adaptive Learning),
              giúp tối ưu hóa thời gian ôn luyện và nâng điểm mục tiêu chính xác.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Bảo mật dữ liệu & Chuẩn đề thi ETS cập nhật</span>
            </div>
          </div>

          {/* Column 1: Luyện thi */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Luyện thi TOEIC</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/exams" className="hover:text-primary transition-colors">
                  Đề thi Full Test (200 câu)
                </Link>
              </li>
              <li>
                <Link href="/practice" className="hover:text-primary transition-colors">
                  Luyện tập theo từng Part
                </Link>
              </li>
              <li>
                <Link href="/placement" className="hover:text-primary transition-colors">
                  Kiểm tra đầu vào nhanh
                </Link>
              </li>
              <li>
                <Link href="/learning-path" className="hover:text-primary transition-colors">
                  Lộ trình điểm 500 / 650 / 800+
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Công nghệ AI */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Công nghệ AI</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/ai-tutor" className="hover:text-primary transition-colors">
                  Trợ giảng AI trực tuyến
                </Link>
              </li>
              <li>
                <Link href="/competency" className="hover:text-primary transition-colors">
                  Phân tích hồ sơ năng lực
                </Link>
              </li>
              <li>
                <Link href="/adaptive" className="hover:text-primary transition-colors">
                  Thuật toán đề xuất thích ứng
                </Link>
              </li>
              <li>
                <Link href="/review-schedule" className="hover:text-primary transition-colors">
                  Ôn tập ngắt quãng (SRS)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Hỗ trợ & Pháp lý */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Hỗ trợ & Pháp lý</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  Về dự án TOEIC Path AI
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  Liên hệ & Góp ý
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TOEIC Path AI. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Phát triển vì mục tiêu học tập thông minh</span>
            <Heart className="h-3.5 w-3.5 text-destructive inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
