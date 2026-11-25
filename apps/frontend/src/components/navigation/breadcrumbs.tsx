"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const segmentLabels: Record<string, string> = {
  student: "Học viên",
  dashboard: "Tổng quan",
  exams: "Đề thi",
  practice: "Luyện tập thích ứng",
  "learning-path": "Lộ trình cá nhân",
  "ai-tutor": "Trợ giảng AI",
  results: "Kết quả & Lời giải",
  "review-schedule": "Lịch ôn tập",
  competency: "Hồ sơ năng lực",
  teacher: "Giảng viên",
  "teacher-dashboard": "Tổng quan Giảng viên",
  questions: "Ngân hàng câu hỏi",
  "question-groups": "Nhóm câu hỏi",
  "content-reviews": "Kiểm duyệt nội dung",
  students: "Quản lý học viên",
  "ai-studio": "AI Studio",
  admin: "Quản trị",
  "admin-dashboard": "Tổng quan Quản trị",
  users: "Quản lý người dùng",
  roles: "Vai trò & Quyền hạn",
  "ai-settings": "Cấu hình AI & Token",
  categories: "Danh mục TOEIC",
  "audit-logs": "Nhật ký hệ thống",
  profile: "Hồ sơ cá nhân",
  settings: "Cài đặt",
  manage: "Quản trị đề thi",
  create: "Tạo mới",
  edit: "Chỉnh sửa",
  builder: "Cấu trúc đề thi",
  import: "Import hàng loạt",
  instructions: "Hướng dẫn phòng thi",
  "exam-attempts": "Phòng thi trực tuyến",
};

const UUID_SEGMENT_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SHORT_CODE_REGEX = /^(Q|QG|RP|IMP)-\d{5,}$/i;

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (SHORT_CODE_REGEX.test(segment)) {
    return segment.toUpperCase();
  }
  if (UUID_SEGMENT_REGEX.test(segment)) {
    if (prevSegment === "exams") return "Chi tiết đề thi";
    if (prevSegment === "exam-attempts") return "Phiên làm bài";
    if (prevSegment === "questions") return "Chi tiết câu hỏi";
    if (prevSegment === "question-groups") return "Chi tiết nhóm câu hỏi";
    return "Chi tiết";
  }
  return decodeURIComponent(segment);
}
export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();

  const segments = React.useMemo(() => {
    if (!pathname || pathname === "/") return [];
    return pathname
      .split("/")
      .filter((s) => s.length > 0 && !s.startsWith("(") && !s.endsWith(")"));
  }, [pathname]);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            title="Trang chủ"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const label = formatSegmentLabel(segment, segments[index - 1]);

          return (
            <React.Fragment key={href}>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              </li>
              <li className="flex items-center">
                {isLast ? (
                  <span
                    className="font-medium text-foreground truncate max-w-[160px] sm:max-w-xs"
                    aria-current="page"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="hover:text-foreground transition-colors truncate max-w-[120px]"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
