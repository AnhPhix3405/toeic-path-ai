"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, Heart } from "lucide-react";

const UPCOMING_FOOTER_ITEMS = [
  "Trợ giảng AI giải đáp 24/7",
  "Lộ trình học theo mục tiêu điểm",
  "Bản đồ phân tích năng lực Nghe – Đọc",
  "Lịch nhắc ôn tập thông minh",
];

export function PublicFooter() {
  const pathname = usePathname();
  const router = useRouter();

  const handleUpcomingClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    label: string
  ) => {
    e.preventDefault();
    toast.info("Tính năng đang trong lộ trình phát triển (Upcoming)", {
      description: `${label} đang được hoàn thiện và sẽ sớm ra mắt.`,
    });
    if (pathname === "/") {
      document
        .getElementById("upcoming-roadmap")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#upcoming-roadmap");
    }
  };

  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column (2 cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold tracking-tight"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-extrabold">TOEIC Path AI</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Nền tảng luyện thi TOEIC trực tuyến đồng hành cùng học viên ở mọi
              mục tiêu điểm số (450+ · 650+ · 800+), kết hợp kho đề thi sát
              chuẩn ETS và lời giải chi tiết.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Đề thi sát chuẩn thực tế · Học tập mọi lúc mọi nơi</span>
            </div>
          </div>

          {/* Column 1: Luyện thi & Đề thi */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Luyện thi & Đề thi
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/exams"
                  className="hover:text-primary transition-colors"
                >
                  Kho đề thi TOEIC công khai
                </Link>
              </li>
              <li>
                <Link
                  href="/#featured-exams"
                  className="hover:text-primary transition-colors"
                >
                  Đề thi nổi bật & Mini Test
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-primary transition-colors"
                >
                  Không gian Học viên
                </Link>
              </li>
              <li>
                <Link
                  href="/results"
                  className="hover:text-primary transition-colors"
                >
                  Lịch sử bài làm & Điểm số
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Sắp ra mắt (Upcoming) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Trợ lý AI
              </h3>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                Upcoming
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {UPCOMING_FOOTER_ITEMS.map((label) => (
                <li key={label}>
                  <Link
                    href="/#upcoming-roadmap"
                    onClick={(e) => handleUpcomingClick(e, label)}
                    className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Thông tin & Điều khoản */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Thông tin & Điều khoản
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/#features"
                  className="hover:text-primary transition-colors"
                >
                  Tính năng nổi bật
                </Link>
              </li>
              <li>
                <Link
                  href="/#workspaces"
                  className="hover:text-primary transition-colors"
                >
                  Dành cho Học viên & Giảng viên
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Chính sách bảo mật
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
