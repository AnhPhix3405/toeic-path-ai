import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary animate-pulse mb-4">
        <Sparkles className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Đang tải dữ liệu TOEIC Path AI...
      </p>
    </div>
  );
}
