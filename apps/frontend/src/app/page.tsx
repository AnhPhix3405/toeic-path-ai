import type { Metadata } from "next";
import { HomePageClient } from "@/features/home/components/home-page-client";

export const metadata: Metadata = {
  title: "TOEIC Path AI — Nền tảng Luyện thi TOEIC Chuẩn ETS & Học tập Thích ứng",
  description:
    "Luyện thi TOEIC trực tuyến với kho đề thi sát chuẩn ETS, chấm điểm tự động thang 10–990 tức thì, giải thích chi tiết và lộ trình học tập thông minh bằng AI.",
  openGraph: {
    title: "TOEIC Path AI — Luyện thi TOEIC Chuẩn ETS 10–990",
    description:
      "Kho đề thi TOEIC Full Test & Mini Test, phòng thi bấm giờ tự động lưu bài làm, chấm điểm tức thì và lời giải chi tiết.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
