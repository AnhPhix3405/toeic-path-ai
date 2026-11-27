"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MonitorCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LIVE_FEATURES = [
  {
    id: "exam-room",
    title: "Phòng Thi Thử Thực Chiến & Luyện Tập Linh Hoạt",
    subtitle: "Thi Full Test hoặc Luyện từng Part",
    description:
      "Trải nghiệm cảm giác phòng thi thật với đồng hồ bấm giờ chuẩn hoặc chia nhỏ từng phần để ôn luyện phù hợp với quỹ thời gian cá nhân.",
    highlights: [
      "Làm đề Full Test (120 phút) hoặc tự chọn các Part muốn luyện",
      "Trình phát âm thanh bài nghe rõ nét, dễ dàng theo dõi tiến độ",
      "Đánh dấu câu hỏi cần xem lại và chuyển nhanh qua bảng câu hỏi",
      "Tự động lưu bài làm liên tục, yên tâm ngay cả khi mất kết nối mạng",
    ],
    href: "/exams",
    ctaLabel: "Vào phòng thi thử",
    icon: MonitorCheck,
  },
  {
    id: "ets-grading",
    title: "Chấm Điểm Chuẩn ETS & Giải Thích Chi Tiết Từng Câu",
    subtitle: "Kết quả tức thì & Ôn tập sau bài thi",
    description:
      "Nhận ngay điểm quy đổi Nghe – Đọc ngay sau khi nộp bài, kèm lời giải chi tiết và bản dịch giúp bạn hiểu sâu nguyên nhân đúng/sai.",
    highlights: [
      "Quy đổi điểm Listening, Reading và Tổng điểm trên thang 10–990",
      "Lọc nhanh các câu Làm đúng, Làm sai, Bỏ qua hoặc Đã đánh dấu",
      "Đọc đầy đủ lời thoại bài nghe (Transcript) và giải thích ngữ pháp",
      "Gửi phản hồi nhanh ngay trên câu hỏi nếu cần giảng viên giải đáp thêm",
    ],
    href: "/results",
    ctaLabel: "Xem kết quả & lời giải",
    icon: Award,
  },
  {
    id: "history-progress",
    title: "Theo Dõi Lịch Sử Làm Bài & Phân Tích Tiến Độ",
    subtitle: "Nhật ký học tập cá nhân",
    description:
      "Lưu trữ toàn bộ lịch sử các lượt làm bài thi thử và luyện tập, giúp bạn dễ dàng nhìn thấy sự tiến bộ qua từng giai đoạn ôn luyện.",
    highlights: [
      "Biểu đồ trực quan theo dõi xu hướng điểm số qua các lần thi",
      "Thống kê tỷ lệ chính xác và thời gian hoàn thành từng bài",
      "Lọc lại lịch sử bài làm theo đề thi, chế độ luyện tập và thời gian",
      "Xem lại bất kỳ bài thi nào đã hoàn thành để ôn tập lại lỗi sai",
    ],
    href: "/results",
    ctaLabel: "Xem lịch sử học tập",
    icon: BarChart3,
  },
  {
    id: "question-bank",
    title: "Kho Câu Hỏi & Ngữ Cảnh Nghe – Đọc Phong Phú",
    subtitle: "Phân loại khoa học theo kỹ năng & độ khó",
    description:
      "Hệ thống câu hỏi đơn và bài đọc/bài nghe theo cụm đoạn văn được phân loại khoa học theo từng chủ đề, kỹ năng và mức độ từ cơ bản đến nâng cao.",
    highlights: [
      "Bao phủ trọn vẹn câu hỏi hình ảnh, hội thoại, ngữ pháp và đọc hiểu",
      "Hỗ trợ đoạn văn đơn, đoạn văn kép và cụm 3 đoạn văn liên kết",
      "Phân loại rõ theo chủ đề thương mại, đời sống và độ khó Dễ / Vừa / Khó",
      "Tìm kiếm, lọc và quản lý tài liệu âm thanh, hình ảnh trực quan",
    ],
    href: "/questions",
    ctaLabel: "Khám phá ngân hàng câu hỏi",
    icon: FileText,
  },
  {
    id: "bulk-import",
    title: "Nhập Bộ Đề Nhanh Từ Tệp Excel & Gói Âm Thanh",
    subtitle: "Công cụ tăng tốc cho Giảng viên",
    description:
      "Giúp giảng viên đưa hàng trăm câu hỏi cùng tệp âm thanh và hình ảnh minh họa lên hệ thống chỉ trong vài thao tác mà không cần nhập thủ công từng câu.",
    highlights: [
      "Tải lên file mẫu Excel kèm tệp nén chứa âm thanh và hình ảnh",
      "Tự động kiểm tra dữ liệu và thông báo rõ các dòng cần chỉnh sửa",
      "Theo dõi tiến trình nhập liệu trực tiếp và xem lại lịch sử các đợt tải lên",
      "Gửi duyệt toàn bộ câu hỏi vừa nhập chỉ với một nút bấm",
    ],
    href: "/questions/import",
    ctaLabel: "Mở công cụ nhập đề",
    icon: FileSpreadsheet,
  },
  {
    id: "exam-builder",
    title: "Thiết Kế Đề Thi & Kiểm Duyệt Nội Dung Chuẩn Hóa",
    subtitle: "Quản lý chất lượng đề thi",
    description:
      "Dễ dàng lắp ghép đề thi Full Test 200 câu, đề Mini Test ngắn hoặc đề kiểm tra đầu vào, đảm bảo mọi câu hỏi đều được rà soát kỹ trước khi mở cho học viên.",
    highlights: [
      "Chọn câu hỏi thủ công hoặc tạo đề tự động theo tỷ lệ độ khó mong muốn",
      "Quy trình rà soát và phê duyệt nội dung rõ ràng giữa các giảng viên",
      "Xem lịch sử chỉnh sửa câu hỏi để đảm bảo độ chính xác của đáp án",
      "Thiết lập linh hoạt thời gian mở/đóng đề thi và số lượt làm bài",
    ],
    href: "/exams/manage",
    ctaLabel: "Quản lý đề thi",
    icon: CheckSquare,
  },
];

export function LiveFeaturesBento() {
  return (
    <>
      {/* Band 1: 6 Live Feature Clusters Bento Grid */}
      <section
        id="features"
        className="scroll-mt-24 border-b border-border bg-slate-50/80 dark:bg-slate-900/40 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-3">
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
              Tính năng hiện có (Đang hoạt động)
            </Badge>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              Trải Nghiệm Luyện Thi & Quản Lý Học Tập Toàn Diện
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base leading-relaxed">
              Mọi công cụ cần thiết để học viên luyện đề tăng điểm mỗi ngày và
              giảng viên xây dựng ngân hàng học liệu chất lượng cao đều đã sẵn
              sàng để bạn trải nghiệm ngay.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LIVE_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card
                  key={feat.id}
                  className="flex flex-col justify-between border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="success" className="text-[11px]">
                        Đang hoạt động
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {feat.subtitle}
                      </p>
                      <CardTitle className="mt-1 text-lg">
                        {feat.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs leading-relaxed">
                      {feat.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <ul className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                      {feat.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full justify-between font-semibold"
                    >
                      <Link href={feat.href}>
                        <span>{feat.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Band 2: Dedicated Learner & Teacher Workspaces */}
      <section
        id="workspaces"
        className="scroll-mt-24 border-b border-border bg-background py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Không Gian Học Tập & Giảng Dạy Chuyên Biệt
            </h2>
            <p className="text-sm text-muted-foreground">
              Thiết kế tối ưu cho cả người tự học TOEIC lẫn đội ngũ giảng viên
              biên soạn học liệu.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="flex flex-col justify-between border-primary/30 bg-card">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <Badge variant="default">Dành cho Học viên</Badge>
                </div>
                <CardTitle>Không gian Luyện thi Cá nhân</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Lựa chọn đề thi phù hợp trình độ, rèn luyện kỹ năng Nghe – Đọc
                  mỗi ngày, nhận điểm số ngay sau khi nộp bài và ôn tập lại các
                  câu sai cùng lời giải chi tiết.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full gap-1.5">
                  <Link href="/dashboard">
                    Vào Không gian Học viên <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-emerald-500/30 bg-card">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge variant="success">Dành cho Giảng viên</Badge>
                </div>
                <CardTitle>Không gian Biên soạn & Quản lý Đề thi</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Xây dựng ngân hàng câu hỏi và bài đọc/bài nghe, nhập đề nhanh
                  từ Excel, duyệt chất lượng nội dung, tổ chức đề thi và giải
                  đáp thắc mắc của học viên.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="success" className="w-full gap-1.5">
                  <Link href="/teacher-dashboard">
                    Vào Không gian Giảng viên <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
