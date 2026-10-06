import * as React from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  UserCheck,
  Cpu,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Điều khoản dịch vụ | TOEIC Path AI",
  description:
    "Quy định và điều khoản sử dụng nền tảng luyện thi TOEIC thích ứng ứng dụng trí tuệ nhân tạo TOEIC Path AI.",
};

const SECTIONS = [
  { id: "intro", title: "1. Giới thiệu & Phạm vi áp dụng" },
  { id: "account", title: "2. Tài khoản & Trách nhiệm người dùng" },
  { id: "ip", title: "3. Quyền sở hữu trí tuệ & Bản quyền" },
  { id: "conduct", title: "4. Quy tắc ứng xử & Nghiêm cấm" },
  { id: "subscription", title: "5. Dịch vụ AI & Gói luyện thi" },
  { id: "liability", title: "6. Giới hạn trách nhiệm pháp lý" },
  { id: "termination", title: "7. Thay đổi & Chấm dứt dịch vụ" },
  { id: "contact", title: "8. Thông tin liên hệ hỗ trợ" },
];

export default function TermsOfServicePage() {
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
            <Scale className="h-3.5 w-3.5 text-primary" />
            Phiên bản hiệu lực: v1.2 (06/10/2026)
          </Badge>
        </div>

        {/* Header Hero */}
        <div className="space-y-4 border-b border-border pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <FileText className="h-4 w-4" /> Thỏa thuận Pháp lý Người dùng
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Điều Khoản Dịch Vụ
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Chào mừng bạn đến với <strong>TOEIC Path AI</strong>. Bằng việc truy cập hoặc đăng ký tài khoản trên nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản được quy định dưới đây.
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

          {/* Detailed Legal Content */}
          <article className="lg:col-span-3 space-y-10 text-sm text-muted-foreground leading-relaxed">
            {/* 1. Intro */}
            <section id="intro" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                1. Giới thiệu & Phạm vi áp dụng
              </h2>
              <p>
                TOEIC Path AI là hệ thống giáo dục trực tuyến ứng dụng công nghệ Trí tuệ Nhân tạo nhằm cung cấp ngân hàng đề thi TOEIC chuẩn format quốc tế, đánh giá năng lực thích ứng (Adaptive Assessment) và gợi ý lộ trình học tập cá nhân hóa.
              </p>
              <p>
                Điều khoản này áp dụng cho mọi đối tượng sử dụng hệ thống bao gồm: Học viên (Student), Giảng viên/Cộng tác viên nội dung (Teacher), và Quản trị viên (Admin).
              </p>
            </section>

            {/* 2. Account */}
            <section id="account" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                2. Tài khoản & Trách nhiệm người dùng
              </h2>
              <p>
                Khi đăng ký tài khoản, bạn cam kết cung cấp thông tin chính xác, đầy đủ và duy trì cập nhật địa chỉ email chính chủ. Mỗi cá nhân chịu trách nhiệm hoàn toàn về việc bảo mật mật khẩu tài khoản của mình.
              </p>
              <Card className="bg-muted/40 border-border">
                <CardContent className="p-4 space-y-2 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Quy định bảo mật tài khoản:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Không chia sẻ hoặc cho thuê tài khoản cho nhiều người sử dụng đồng thời.</li>
                    <li>Thông báo ngay lập tức cho ban quản trị khi phát hiện hành vi truy cập trái phép.</li>
                    <li>Chúng tôi có quyền tạm khóa hoặc vô hiệu hóa tài khoản vi phạm chính sách bảo mật mà không cần báo trước.</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* 3. Intellectual Property */}
            <section id="ip" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                3. Quyền sở hữu trí tuệ & Bản quyền
              </h2>
              <p>
                Toàn bộ nội dung trên TOEIC Path AI bao gồm: ngân hàng câu hỏi, đoạn văn nghe/đọc, giải thích chi tiết, thuật toán chấm điểm AI, giao diện đồ họa, mã nguồn và cơ sở dữ liệu đều thuộc quyền sở hữu trí tuệ độc quyền của TOEIC Path AI hoặc các đối tác được cấp phép.
              </p>
              <p>
                Nghiêm cấm mọi hành vi sao chép, phân phối, trích xuất dữ liệu tự động (data scraping), dịch ngược mã nguồn (reverse engineering) hoặc thương mại hóa nội dung khi chưa có sự đồng ý bằng văn bản.
              </p>
            </section>

            {/* 4. Conduct */}
            <section id="conduct" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                4. Quy tắc ứng xử & Các hành vi bị nghiêm cấm
              </h2>
              <p>Người dùng cam kết KHÔNG thực hiện các hành vi sau:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Sử dụng bot, script hoặc công cụ tự động để giải đề hoặc spam hệ thống.</li>
                <li>Can thiệp, tấn công từ chối dịch vụ (DoS/DDoS) hoặc làm gián đoạn hạ tầng máy chủ.</li>
                <li>Tải lên các nội dung vi phạm pháp luật, thuần phong mỹ tục hoặc chứa mã độc.</li>
                <li>Cố ý khai thác lỗ hổng bảo mật nhằm thay đổi điểm số hoặc chiếm đoạt tài nguyên AI Token.</li>
              </ul>
            </section>

            {/* 5. Subscription & AI Tokens */}
            <section id="subscription" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                5. Dịch vụ Trợ giảng AI & Gói luyện thi
              </h2>
              <p>
                Học viên được cung cấp hạn mức tương tác với Trợ giảng AI (AI Tutor) và tính năng tạo đề thi mô phỏng theo số lượng Token tương ứng với gói tài khoản đăng ký.
              </p>
              <p>
                Các gói dịch vụ trả phí được thanh toán theo chu kỳ quy định. Chính sách hoàn tiền chỉ được áp dụng trong vòng 7 ngày đầu tiên nếu hệ thống phát sinh lỗi kỹ thuật nghiêm trọng không thể khắc phục.
              </p>
            </section>

            {/* 6. Liability */}
            <section id="liability" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                6. Giới hạn trách nhiệm pháp lý
              </h2>
              <p>
                TOEIC Path AI không đảm bảo kết quả thi chính thức của học viên tại các kỳ thi TOEIC quốc tế sẽ đạt tuyệt đối theo điểm thi thử, dù mô hình AI luôn nỗ lực mô phỏng độ khó sát nhất với đề thi thật ETS.
              </p>
              <p>
                Chúng tôi không chịu trách nhiệm đối với các gián đoạn dịch vụ do sự cố đường truyền Internet của người dùng hoặc các trường hợp bất khả kháng.
              </p>
            </section>

            {/* 7. Termination */}
            <section id="termination" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                7. Thay đổi & Chấm dứt dịch vụ
              </h2>
              <p>
                Chúng tôi có quyền cập nhật, sửa đổi Điều khoản dịch vụ này vào bất kỳ lúc nào để phù hợp với quy định pháp luật và nâng cấp tính năng hệ thống. Phiên bản cập nhật sẽ được công bố trực tiếp trên trang web kèm ngày hiệu lực.
              </p>
            </section>

            {/* 8. Contact */}
            <section id="contact" className="space-y-3 scroll-mt-24 border-t border-border pt-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                8. Thông tin liên hệ hỗ trợ
              </h2>
              <p>
                Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc khiếu nại nào liên quan đến Điều khoản dịch vụ, xin vui lòng liên hệ với chúng tôi:
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1 text-xs">
                <p className="font-semibold text-foreground">Ban Quản Trị TOEIC Path AI</p>
                <p>Email hỗ trợ: <a href="mailto:support@toeicpath.ai" className="text-primary hover:underline font-medium">support@toeicpath.ai</a></p>
                <p>Hotline: 1900-TOEIC-AI (Giờ hành chính: 08:30 - 18:00)</p>
                <p>Địa chỉ: Khu Công nghệ Phần mềm, Đại học Quốc gia TP.HCM</p>
              </div>
            </section>
          </article>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border pt-8 gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Tham khảo thêm <Link href="/privacy" className="text-primary hover:underline font-medium">Chính sách bảo mật</Link> để hiểu rõ cách chúng tôi bảo vệ dữ liệu của bạn.
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
