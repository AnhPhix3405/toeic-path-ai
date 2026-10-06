import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  History,
  Calendar,
  Award,
  FileText,
  Layers,
  Users,
  CheckSquare,
  Bot,
  Shield,
  Sliders,
  Key,
  Tag,
  Activity,
  Home,
  Compass,
  HelpCircle,
  Info,
} from "lucide-react";
import { NavItem, NavSection, RoleNavConfig, UserRole } from "@/types/navigation";

export const publicNavItems: NavItem[] = [
  {
    title: "Trang chủ",
    href: "/",
    icon: Home,
  },
  {
    title: "Đề thi thử",
    href: "/exams",
    icon: BookOpen,
  },
  {
    title: "Lộ trình TOEIC",
    href: "/learning-path",
    icon: Compass,
  },
  {
    title: "Trợ giảng AI",
    href: "/ai-tutor",
    icon: Sparkles,
  },
  {
    title: "Giới thiệu",
    href: "/about",
    icon: Info,
  },
];

export const studentNavSections: NavSection[] = [
  {
    title: "TỔNG QUAN",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Hồ sơ năng lực",
        href: "/competency",
        icon: Award,
      },
    ],
  },
  {
    title: "HỌC TẬP & THI",
    items: [
      {
        title: "Đề thi TOEIC",
        href: "/exams",
        icon: BookOpen,
        badge: "HOT",
        badgeVariant: "primary",
      },
      {
        title: "Luyện tập thích ứng",
        href: "/practice",
        icon: Sparkles,
      },
      {
        title: "Lộ trình cá nhân",
        href: "/learning-path",
        icon: Compass,
      },
      {
        title: "Lịch ôn tập",
        href: "/review-schedule",
        icon: Calendar,
      },
    ],
  },
  {
    title: "AI & KẾT QUẢ",
    items: [
      {
        title: "Trợ giảng AI",
        href: "/ai-tutor",
        icon: Bot,
      },
      {
        title: "Lịch sử & Điểm số",
        href: "/results",
        icon: History,
      },
    ],
  },
];

export const teacherNavSections: NavSection[] = [
  {
    title: "QUẢN TRỊ ĐÀO TẠO",
    items: [
      {
        title: "Teacher Dashboard",
        href: "/teacher-dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Quản lý học viên",
        href: "/students",
        icon: Users,
      },
    ],
  },
  {
    title: "QUẢN LÝ NỘI DUNG",
    items: [
      {
        title: "Ngân hàng câu hỏi",
        href: "/questions",
        icon: FileText,
      },
      {
        title: "Nhóm câu hỏi",
        href: "/question-groups",
        icon: Layers,
      },
      {
        title: "Quản lý đề thi",
        href: "/exams",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "KIỂM DUYỆT & AI",
    items: [
      {
        title: "Kiểm duyệt nội dung",
        href: "/content-reviews",
        icon: CheckSquare,
        badge: "3",
        badgeVariant: "warning",
      },
      {
        title: "AI Question Studio",
        href: "/ai-studio",
        icon: Sparkles,
      },
    ],
  },
];

export const adminNavSections: NavSection[] = [
  {
    title: "HỆ THỐNG",
    items: [
      {
        title: "Admin Dashboard",
        href: "/admin-dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Nhật ký hệ thống",
        href: "/audit-logs",
        icon: Activity,
      },
    ],
  },
  {
    title: "TÀI KHOẢN & PHÂN QUYỀN",
    items: [
      {
        title: "Người dùng",
        href: "/users",
        icon: Users,
      },
      {
        title: "Vai trò & Quyền hạn",
        href: "/roles",
        icon: Shield,
      },
    ],
  },
  {
    title: "CẤU HÌNH",
    items: [
      {
        title: "Cấu hình AI & Token",
        href: "/ai-settings",
        icon: Sliders,
      },
      {
        title: "Danh mục TOEIC",
        href: "/categories",
        icon: Tag,
      },
    ],
  },
];

export function getNavSectionsForRole(role: UserRole): NavSection[] {
  switch (role) {
    case "student":
      return studentNavSections;
    case "teacher":
      return teacherNavSections;
    case "admin":
      return adminNavSections;
    default:
      return [];
  }
}
