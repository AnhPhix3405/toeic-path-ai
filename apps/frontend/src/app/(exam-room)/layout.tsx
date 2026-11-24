"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

export default function ExamRoomStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-2 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <p className="text-sm">Đang chuẩn bị phòng thi trực tuyến...</p>
      </div>
    );
  }

  return <>{children}</>;
}
