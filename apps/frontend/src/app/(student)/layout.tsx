import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout role="student">{children}</AppLayout>;
}
