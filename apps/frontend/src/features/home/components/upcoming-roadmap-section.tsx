"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Compass,
  Radar,
  Sparkles,
  Wand2,
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

interface UpcomingFeatureItem {
  id: string;
  category: string;
  title: string;
  description: string;
  highlights: string[];
  icon: React.ElementType;
}

const UPCOMING_FEATURES: UpcomingFeatureItem[] = [
  {
    id: "adaptive-learning-path",
    category: "Cá nhân hóa học tập",
    title: "Lộ Trình Học Tập Thích Ứng Theo Mục Tiêu",
    description:
      "Tự chọn mục tiêu điểm số mong muốn (450+, 650+ hoặc 800+) và thời gian ôn tập; hệ thống sẽ gợi ý kế hoạch học tập từng tuần phù hợp với trình độ hiện tại của bạn.",
    highlights: [
      "Bài kiểm tra đầu vào ngắn gọn để xác định điểm xuất phát",
      "Kế hoạch ôn luyện linh hoạt, tự điều chỉnh theo tốc độ học của bạn",
    ],
    icon: Compass,
  },
  {
    id: "adaptive-practice-srs",
    category: "Ôn tập thông minh",
    title: "Luyện Tập Khắc Phục Điểm Yếu & Nhắc Ôn Tập",
    description:
      "Tự động tổng hợp những chủ đề ngữ pháp và dạng bài nghe bạn thường nhầm lẫn thành các bài luyện ngắn, kết hợp lịch nhắc ôn tập đúng thời điểm.",
    highlights: [
      "Ưu tiên gợi ý bài tập thuộc các phần kỹ năng cần cải thiện",
      "Lịch ôn tập ngắt quãng giúp ghi nhớ từ vựng và cấu trúc câu lâu hơn",
    ],
    icon: CalendarClock,
  },
  {
    id: "ai-tutor-chat",
    category: "Trợ lý học tập AI",
    title: "Trợ Giảng AI Giải Đáp 24/7 Trên Từng Câu Hỏi",
    description:
      "Đặt câu hỏi trực tiếp cho Trợ giảng AI ngay khi đang xem lại bài thi để được giải thích cặn kẽ ngữ pháp, cách dùng từ và mẹo làm bài nhanh.",
    highlights: [
      "Giải thích dễ hiểu vì sao đáp án này đúng và các phương án khác chưa phù hợp",
      "Gợi ý từ vựng đồng nghĩa và cấu trúc thường gặp trong đề thi",
    ],
    icon: Bot,
  },
  {
    id: "ai-question-studio",
    category: "Trợ lý soạn giảng AI",
    title: "AI Hỗ Trợ Giảng Viên Biên Soạn Câu Hỏi & Lời Giải",
    description:
      "Giúp giảng viên tiết kiệm thời gian soạn đề nhờ khả năng gợi ý câu hỏi nháp, đoạn văn thương mại và lời giải thích chi tiết theo chủ đề.",
    highlights: [
      "Tạo nhanh các câu hỏi tương tự để học viên luyện tập mở rộng",
      "Giảng viên dễ dàng chỉnh sửa và duyệt lại trước khi đưa vào ngân hàng đề",
    ],
    icon: Wand2,
  },
  {
    id: "competency-radar",
    category: "Phân tích năng lực",
    title: "Bản Đồ Năng Lực Đa Chiều & Dự Báo Điểm Thi",
    description:
      "Trực quan hóa điểm mạnh – điểm yếu của bạn qua biểu đồ kỹ năng Nghe – Đọc và ước tính mức điểm TOEIC thực tế dựa trên phong độ làm bài gần nhất.",
    highlights: [
      "Nhìn rõ mức độ vững vàng ở từng chủ đề từ vựng và dạng câu hỏi",
      "Đánh giá mức độ sẵn sàng trước khi đăng ký kỳ thi thật",
    ],
    icon: Radar,
  },
];

export function UpcomingRoadmapSection() {
  const handlePreviewUpcoming = (item: UpcomingFeatureItem) => {
    toast.info(`Upcoming: ${item.title}`, {
      description: `Tính năng "${item.title}" đang được hoàn thiện và sẽ sớm ra mắt học viên.`,
    });
  };

  return (
    <section
      id="upcoming-roadmap"
      className="scroll-mt-24 bg-background py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Upcoming · Tính Năng Sắp Ra Mắt
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Lộ Trình Học Tập Thích Ứng & Trợ Giảng AI (Upcoming)
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base leading-relaxed">
            Bên cạnh kho đề thi và phòng luyện tập đang mở, các tính năng cá
            nhân hóa và trợ lý AI dưới đây đang được hoàn thiện với nhãn{" "}
            <strong className="text-amber-700 dark:text-amber-300">
              Upcoming
            </strong>{" "}
            để sớm đồng hành cùng bạn.
          </p>
        </div>

        {/* Upcoming Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {UPCOMING_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between border-dashed border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-500/[0.04]"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="warning"
                      className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    >
                      <Sparkles className="h-3 w-3" />
                      Upcoming
                    </Badge>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      {item.category}
                    </p>
                    <CardTitle className="mt-1 text-lg">{item.title}</CardTitle>
                  </div>

                  <CardDescription className="text-xs leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <ul className="space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground">
                    {item.highlights.map((hl) => (
                      <li key={hl} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewUpcoming(item)}
                    className="w-full text-xs font-semibold border-amber-500/30 hover:bg-amber-500/10"
                  >
                    Tìm hiểu tính năng (Upcoming)
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Conversion Banner Card in the 6th slot */}
          <Card className="flex flex-col justify-between border-primary/30 bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 p-6">
            <div className="space-y-3">
              <Badge variant="default">Bắt đầu ngay hôm nay</Badge>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                Sẵn sàng luyện đề và kiểm tra trình độ hiện tại của bạn?
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Kho đề thi thử, chế độ luyện từng Part, chấm điểm tự động và lời
                giải chi tiết đã sẵn sàng để bạn bắt đầu hoàn toàn miễn phí.
              </p>
            </div>
            <div className="pt-6 space-y-2.5">
              <Button asChild className="w-full gap-1.5 font-semibold">
                <Link href="/exams">
                  Khám phá Kho đề thi <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/register">Tạo tài khoản miễn phí</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
