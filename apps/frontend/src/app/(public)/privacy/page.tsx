import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Database,
  Eye,
  FileCheck,
  UserCheck,
  Cookie,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Chính sách bảo mật | TOEIC Path AI",
  description:
    "Chính sách bảo vệ thông tin cá nhân và dữ liệu học tập của học viên trên nền tảng TOEIC Path AI.",
};

const SECTIONS = [
  { id: "collection", title: "1. Thông tin chúng tôi thu thập" },
  { id: "learning-data", title: "2. Dữ liệu học tập & Đánh giá năng lực" },
  { id: "purpose", title: "3. Mục đích sử dụng thông tin" },
  { id: "security", title: "4. Cơ chế bảo mật & Lưu trữ" },
  { id: "sharing", title: "5. Chia sẻ thông tin với bên thứ ba" },
  { id: "cookies", title: "6. Chính sách Cookies & Lưu trữ phiên" },
  { id: "user-rights", title: "7. Quyền kiểm soát dữ liệu của bạn" },
  { id: "contact", title: "8. Liên hệ bộ phận bảo mật dữ liệu" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Breadcrumb & Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại trang Đăng ký
          </Link>
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Phiên bản hiệu lực: v1.2 (06/10/2026)
          </Badge>
        </div>

        {/* Header Hero */}
        <div className="space-y-4 border-b border-border pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Lock className="h-4 w-4" /> Cam kết Bảo mật Dữ liệu Học viên
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Chính Sách Bảo Mật
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Tại <strong>TOEIC Path AI</strong>, chúng tôi tôn trọng và cam kết bảo vệ quyền riêng tư cá nhân của bạn. Chính sách này mô tả chi tiết cách thức chúng tôi thu thập, xử lý, bảo mật và trao cho bạn toàn quyền kiểm soát dữ liệu của mình.
          </p>
        </div>

        {/* Content Body with Quick Nav */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Table of Contents (Desktop Sticky) */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mục lục điều hướng
              </h2>
              <nav className="space-y-1">
                {SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Detailed Privacy Content */}
          <article className="lg:col-span-3 space-y-10 text-sm text-muted-foreground leading-relaxed">
            {/* 1. Collection */}
            <section id="collection" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                1. Thông tin chúng tôi thu thập
              </h2>
              <p>
                Chúng tôi chỉ thu thập các thông tin thực sự cần thiết nhằm thiết lập tài khoản và tối ưu hóa trải nghiệm học tập của bạn:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-foreground">Thông tin định danh:</strong> Họ và tên, địa chỉ email, ảnh đại diện (avatar khi dùng Google OAuth).</li>
                <li><strong className="text-foreground">Thông tin mục tiêu học tập:</strong> Mục tiêu điểm số TOEIC mong muốn (450, 600, 750, 850, 990), lịch thi dự kiến và thói quen ôn luyện.</li>
                <li><strong className="text-foreground">Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành và nhật ký đăng nhập để bảo vệ an toàn tài khoản.</li>
              </ul>
            </section>

            {/* 2. Learning Data */}
            <section id="learning-data" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                2. Dữ liệu học tập & Đánh giá năng lực
              </h2>
              <p>
                Để mô hình AI có thể cá nhân hóa lộ trình thích ứng, hệ thống ghi nhận các thông số tương tác trong quá trình làm bài thi:
              </p>
              <Card className="bg-muted/40 border-border">
                <CardContent className="p-4 space-y-2 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Dữ liệu phân tích chuyên sâu:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Lịch sử làm bài: Câu trả lời đã chọn, đáp án đúng/sai, số lần làm lại đề.</li>
                    <li>Chỉ số thời gian: Thời gian trung bình giải từng câu, độ trễ phản xạ đọc hiểu Part 7.</li>
                    <li>Cây năng lực ngữ pháp & từ vựng: Xác định các chủ điểm thường xuyên sai để Trợ giảng AI gợi ý bài tập phục hồi.</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* 3. Purpose */}
            <section id="purpose" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                3. Mục đích sử dụng thông tin
              </h2>
              <p>Dữ liệu của bạn được sử dụng duy nhất cho các mục đích chính đáng sau:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Cung cấp và duy trì dịch vụ luyện thi trực tuyến, tự động chấm điểm và tổng hợp bảng phân tích năng lực.</li>
                <li>Cung cấp tính năng Trợ giảng AI giải thích ngữ cảnh chi tiết câu hỏi theo đúng trình độ hiện tại.</li>
                <li>Gửi thông báo định kỳ về tiến độ học tập, nhắc nhở lịch làm bài thi thử qua email (nếu bạn bật tùy chọn).</li>
                <li>Phát hiện và ngăn chặn kịp thời các hành vi gian lận thi cử hoặc truy cập trái phép.</li>
              </ul>
            </section>

            {/* 4. Security */}
            <section id="security" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-500" />
                4. Cơ chế bảo mật & Lưu trữ
              </h2>
              <p>
                Chúng tôi áp dụng các tiêu chuẩn an ninh mạng công nghiệp hiện đại nhất để đảm bảo an toàn tuyệt đối cho dữ liệu của học viên:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-foreground">Mã hóa đường truyền:</strong> Toàn bộ dữ liệu truyền tải giữa trình duyệt và máy chủ được mã hóa qua giao thức SSL/TLS 256-bit.</li>
                <li><strong className="text-foreground">Mã hóa mật khẩu:</strong> Mật khẩu được băm (hash) bằng thuật toán <code>bcrypt</code> với độ phức tạp cao, không bao giờ được lưu dưới dạng văn bản thuần (plain text).</li>
                <li><strong className="text-foreground">Bảo vệ Token:</strong> Sử dụng JWT Token kết hợp cơ chế Silent Refresh Mutex Queue và Cookie bảo mật <code>SameSite=Lax</code> chống tấn công CSRF.</li>
              </ul>
            </section>

            {/* 5. Sharing */}
            <section id="sharing" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                5. Chia sẻ thông tin với bên thứ ba
              </h2>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-1.5">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Cam kết Không thương mại hóa dữ liệu cá nhân:
                </p>
                <p className="text-foreground">
                  TOEIC Path AI <strong>KHÔNG BAO GIỜ</strong> bán, cho thuê hoặc chia sẻ dữ liệu thông tin cá nhân của học viên cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
                </p>
              </div>
              <p className="text-xs">
                Chúng tôi chỉ chia sẻ dữ liệu giới hạn với các đối tác hạ tầng thiết yếu (như dịch vụ máy chủ đám mây, Google OAuth Authentication) đã ký cam kết tuân thủ nghiêm ngặt chuẩn bảo mật thông tin.
              </p>
            </section>

            {/* 6. Cookies */}
            <section id="cookies" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Cookie className="h-5 w-5 text-amber-500" />
                6. Chính sách Cookies & Lưu trữ phiên
              </h2>
              <p>
                Hệ thống sử dụng Cookie và LocalStorage nhằm mục đích:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Duy trì trạng thái đăng nhập an toàn trong suốt phiên học tập (Auth Token Cookie).</li>
                <li>Lưu trữ tùy chọn giao diện người dùng (Chế độ Sáng/Tối - Dark/Light Theme).</li>
                <li>Lưu tạm câu trả lời bài thi dở dang để tránh mất dữ liệu khi mất kết nối mạng đột ngột.</li>
              </ul>
            </section>

            {/* 7. User Rights */}
            <section id="user-rights" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                7. Quyền kiểm soát dữ liệu của bạn
              </h2>
              <p>Bạn luôn có toàn quyền đối với dữ liệu cá nhân của mình trên hệ thống:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-foreground">Quyền truy cập & Xem:</strong> Xem lại toàn bộ lịch sử thi, báo cáo phân tích điểm số và thông tin cá nhân trong trang Profile.</li>
                <li><strong className="text-foreground">Quyền chỉnh sửa:</strong> Cập nhật họ tên, mục tiêu điểm số và mật khẩu bất kỳ lúc nào.</li>
                <li><strong className="text-foreground">Quyền yêu cầu xóa vĩnh viễn:</strong> Gửi yêu cầu xóa hoàn toàn tài khoản và lịch sử dữ liệu học tập khỏi cơ sở dữ liệu hệ thống.</li>
              </ul>
            </section>

            {/* 8. Contact */}
            <section id="contact" className="space-y-3 scroll-mt-24 border-t border-border pt-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                8. Liên hệ bộ phận bảo mật dữ liệu
              </h2>
              <p>
                Mọi yêu cầu thực thi quyền dữ liệu cá nhân hoặc phản hồi về chính sách bảo mật xin vui lòng gửi về:
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1 text-xs">
                <p className="font-semibold text-foreground">Bộ phận Bảo vệ Dữ liệu & An ninh Thông tin (DPO)</p>
                <p>Email bảo mật: <a href="mailto:privacy@toeicpath.ai" className="text-primary hover:underline font-medium">privacy@toeicpath.ai</a></p>
                <p>Hotline an ninh dữ liệu: 1900-TOEIC-AI (Nhánh 2)</p>
                <p>Thời gian phản hồi cam kết: Trong vòng 24 - 48 giờ làm việc.</p>
              </div>
            </section>
          </article>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border pt-8 gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Tham khảo thêm <Link href="/terms" className="text-primary hover:underline font-medium">Điều khoản dịch vụ</Link> để hiểu rõ quyền và trách nhiệm khi sử dụng hệ thống.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Đăng ký tài khoản</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
