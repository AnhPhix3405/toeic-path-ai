import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout role="teacher">{children}</AppLayout>;
}
