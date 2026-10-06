import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground mb-4">
        <FileQuestion className="h-8 w-8" />
      </div>
      <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary mb-2">
        Mã lỗi: 404
      </span>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Không tìm thấy trang
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Trang hoặc tài nguyên bạn đang cố gắng truy cập không tồn tại hoặc đã được di chuyển.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" /> Quay về Trang chủ
        </Link>
      </div>
    </div>
  );
}
