import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout role="admin">{children}</AppLayout>;
}
