"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  LayoutDashboard,
  Users,
  Shield,
  ArrowRight,
  Layers,
  AlertTriangle,
  MoreHorizontal,
  Filter,
  FileCheck,
  Activity,
  Wifi,
  WifiOff,
  ShieldAlert,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { useApiHealth } from "@/services/health.service";
import { apiClient, parseApiError } from "@/services/api-client";
import { ErrorBoundary } from "@/components/feedback/error-boundary";

function BuggyCounter() {
  const [shouldCrash, setShouldCrash] = React.useState(false);

  if (shouldCrash) {
    throw new Error("Lỗi giả lập từ BuggyCounter để kiểm tra ErrorBoundary fallback!");
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg bg-card text-card-foreground">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold mb-1">Thành phần hoạt động bình thường</p>
      <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">
        Bấm nút bên dưới để chủ động kích hoạt lỗi Render và kích hoạt ErrorBoundary.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShouldCrash(true)}
      >
        Kích hoạt lỗi Render Runtime
      </Button>
    </div>
  );
}

export default function Home() {
  const [btnLoading, setBtnLoading] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [apiTesting, setApiTesting] = React.useState(false);

  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
    isFetching: isHealthFetching,
  } = useApiHealth();

  const handleTestApi = async (type: "health" | "400" | "401" | "500") => {
    setApiTesting(true);
    try {
      if (type === "health") {
        const res = await apiClient.get<{ status: string }>("/health");
        toast.success("API thành công (200 OK)", {
          description: `Backend phản hồi: ${JSON.stringify(res.data)}`,
        });
      } else {
        await apiClient.get(`/mock/error/${type}`);
      }
    } catch (err) {
      const apiErr = parseApiError(err);
      toast.error(`Bắt lỗi HTTP ${apiErr.statusCode}`, {
        description: apiErr.message,
      });
    } finally {
      setApiTesting(false);
    }
  };

  const triggerLoading = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      toast.success("Xử lý dữ liệu thành công!", {
        description: "Hệ thống đã lưu trạng thái làm bài của bạn.",
      });
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">TOEIC Path AI</span>
              <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Design System & Primitives v1.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {/* Intro */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Layers className="h-3.5 w-3.5" /> Sprint 1 Frontend — Shared UI Component Primitives
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Thư viện Thành phần Giao diện & Layouts
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Hệ thống UI Primitives hoàn chỉnh xây dựng trên <strong>Radix UI</strong>, <strong>Tailwind CSS 4</strong>, <strong>CVA</strong> và <strong>Sonner Toasts</strong> đạt chuẩn WCAG 2.1 AA.
          </p>
        </section>

        {/* 1. Workspaces Preview */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">1. Không gian Làm việc (Core Layouts)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/30 flex flex-col justify-between">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <Badge variant="default">Student</Badge>
                </div>
                <CardTitle>Không gian Học viên</CardTitle>
                <CardDescription>
                  Dashboard học tập, Đề thi TOEIC, Luyện tập thích ứng, Lộ trình cá nhân và Trợ giảng AI.
                </CardDescription>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href="/dashboard">
                    Mở Student Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="border-emerald-500/30 flex flex-col justify-between">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge variant="success">Teacher</Badge>
                </div>
                <CardTitle>Không gian Giảng viên</CardTitle>
                <CardDescription>
                  Ngân hàng câu hỏi, Nhóm passage, Quản lý đề thi, Kiểm duyệt Maker-Checker và AI Studio.
                </CardDescription>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button asChild variant="success" className="w-full">
                  <Link href="/teacher-dashboard">
                    Mở Teacher Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="border-amber-500/30 flex flex-col justify-between">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <Badge variant="warning">Admin</Badge>
                </div>
                <CardTitle>Không gian Quản trị</CardTitle>
                <CardDescription>
                  Quản lý tài khoản, Phân quyền RBAC, Cấu hình AI Token và Nhật ký hệ thống Audit Logs.
                </CardDescription>
              </CardHeader>
              <div className="p-6 pt-0">
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/admin-dashboard">
                    Mở Admin Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* 2. Interactive Buttons & Toast Triggers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">2. Button Variants & Feedback Toasts</h2>
          <Card>
            <CardHeader>
              <CardTitle>Các Biến thể Nút bấm & Thông báo Toast</CardTitle>
              <CardDescription>
                Thử nghiệm tương tác với các trạng thái nút và gọi Sonner Toast Notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => toast.success("Lưu bài thi thành công!")}>
                  Primary (Success Toast)
                </Button>
                <Button variant="secondary" onClick={() => toast.info("Đã đánh dấu câu 45 để xem lại")}>
                  Secondary (Info Toast)
                </Button>
                <Button variant="outline" onClick={() => toast.warning("Thời gian làm bài còn dưới 5 phút!")}>
                  Outline (Warning Toast)
                </Button>
                <Button variant="destructive" onClick={() => toast.error("Không thể kết nối máy chủ!")}>
                  Destructive (Error Toast)
                </Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="link">Link Style</Button>
                <Button isLoading={btnLoading} onClick={triggerLoading}>
                  {btnLoading ? "Đang xử lý..." : "Bấm để Loading"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Form Controls & Validation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">3. Form Controls (Input, Select, Checkbox, Radio)</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Input & Error toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Họ và tên thí sinh</label>
                  <Input
                    placeholder="Nhập họ và tên..."
                    defaultValue="Nguyễn Văn A"
                    error={hasError}
                  />
                  {hasError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Vui lòng nhập họ tên hợp lệ.
                    </p>
                  )}
                  <button
                    onClick={() => setHasError(!hasError)}
                    className="text-xs text-primary underline cursor-pointer"
                    type="button"
                  >
                    {hasError ? "Tắt lỗi input" : "Bật thử trạng thái lỗi (Validation Error)"}
                  </button>
                </div>

                {/* Select Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Chọn Phần thi TOEIC</label>
                  <Select defaultValue="part5">
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn Part..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part1">Part 1 — Photographs (Mô tả hình ảnh)</SelectItem>
                      <SelectItem value="part2">Part 2 — Question-Response (Hỏi đáp)</SelectItem>
                      <SelectItem value="part3">Part 3 — Conversations (Hội thoại ngắn)</SelectItem>
                      <SelectItem value="part4">Part 4 — Short Talks (Bài nói ngắn)</SelectItem>
                      <SelectItem value="part5">Part 5 — Incomplete Sentences (Điền câu)</SelectItem>
                      <SelectItem value="part6">Part 6 — Text Completion (Điền đoạn văn)</SelectItem>
                      <SelectItem value="part7">Part 7 — Reading Comprehension (Đọc hiểu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Lời giải thích chi tiết câu hỏi</label>
                <Textarea placeholder="Nhập hướng dẫn giải hoặc dịch nghĩa đoạn văn..." defaultValue="Cần một trạng từ (adverb) bổ nghĩa cho cụm 'more efficient'." />
              </div>

              {/* Radio Group & Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Lựa chọn đáp án đúng (RadioGroup)</label>
                  <RadioGroup defaultValue="B">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="r1" />
                      <label htmlFor="r1" className="text-sm cursor-pointer">(A) consider</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="r2" />
                      <label htmlFor="r2" className="text-sm font-semibold text-primary cursor-pointer">(B) considerably (Đúng)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="r3" />
                      <label htmlFor="r3" className="text-sm cursor-pointer">(C) consideration</label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Tùy chọn cấu hình (Checkbox)</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="c1" defaultChecked />
                      <label htmlFor="c1" className="text-sm cursor-pointer">Xáo trộn thứ tự câu hỏi</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="c2" defaultChecked />
                      <label htmlFor="c2" className="text-sm cursor-pointer">Tự động nộp bài khi hết 120 phút</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="c3" />
                      <label htmlFor="c3" className="text-sm cursor-pointer">Cho phép xem lời giải ngay sau khi nộp</label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. Overlays: Dialog, Popover, Dropdown */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">4. Overlays & Modals (Dialog, Popover, Dropdown)</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4 items-center">
              {/* Dialog Trigger */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <FileCheck className="h-4 w-4 mr-1.5" /> Mở Modal Xác nhận Nộp bài
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Xác nhận nộp bài thi TOEIC?</DialogTitle>
                    <DialogDescription>
                      Bạn đã hoàn thành <strong>194 / 200 câu hỏi</strong>. Còn <strong>6 câu</strong> chưa chọn đáp án và <strong>2 câu</strong> được đánh dấu xem lại.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listening (Part 1–4):</span>
                      <span className="font-semibold text-success">100 / 100 câu</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reading (Part 5–7):</span>
                      <span className="font-semibold text-warning">94 / 100 câu</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Tiếp tục làm bài
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDialogOpen(false);
                        toast.success("Nộp bài thành công! Đang chuyển sang bảng điểm...");
                      }}
                    >
                      Xác nhận Nộp bài
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Popover Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-1.5" /> Bộ lọc nhanh (Popover)
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-3">
                  <h4 className="font-semibold text-sm">Lọc danh sách đề thi</h4>
                  <div className="space-y-2 text-xs">
                    <label className="font-medium">Mức độ khó</label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Độ khó..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả độ khó</SelectItem>
                        <SelectItem value="easy">Dễ (450–600)</SelectItem>
                        <SelectItem value="medium">Trung bình (600–750)</SelectItem>
                        <SelectItem value="hard">Khó (750–990)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => toast.info("Đã áp dụng bộ lọc!")}>
                    Áp dụng
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    Hành động (DropdownMenu) <MoreHorizontal className="h-4 w-4 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Tùy chọn đề thi</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.success("Đã sao chép liên kết đề thi!")}>
                    Sao chép liên kết đề thi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Đã xuất bản đề thi công khai!")}>
                    Xuất bản đề thi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => toast.error("Đã chuyển vào thùng rác!")}>
                    Xóa đề thi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </section>

        {/* 5. Data Table & Skeleton */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">5. Data Table & Skeleton Loading</h2>
            <Button size="sm" variant="outline" onClick={() => setShowSkeleton(!showSkeleton)}>
              {showSkeleton ? "Hiển thị Dữ liệu Thật" : "Bật Shimmer Skeleton"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Đề thi</TableHead>
                <TableHead>Tên Đề thi</TableHead>
                <TableHead>Loại đề</TableHead>
                <TableHead>Số câu</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold">ETS-2026-01</TableCell>
                    <TableCell className="font-medium">TOEIC Full Test Format 2026 — Đề số 01</TableCell>
                    <TableCell><Badge variant="default">Full Test</Badge></TableCell>
                    <TableCell>200 câu</TableCell>
                    <TableCell>120 phút</TableCell>
                    <TableCell><Badge variant="success">Đang mở</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard">Vào thi</Link>
                      </Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold">MINI-RC-04</TableCell>
                    <TableCell className="font-medium">Luyện tập nhanh Reading Part 5 & 6</TableCell>
                    <TableCell><Badge variant="secondary">Mini Test</Badge></TableCell>
                    <TableCell>46 câu</TableCell>
                    <TableCell>35 phút</TableCell>
                    <TableCell><Badge variant="success">Đang mở</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/practice">Luyện tập</Link>
                      </Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold">PLACE-01</TableCell>
                    <TableCell className="font-medium">Bài đánh giá trình độ đầu vào thích ứng</TableCell>
                    <TableCell><Badge variant="warning">Placement</Badge></TableCell>
                    <TableCell>50 câu</TableCell>
                    <TableCell>45 phút</TableCell>
                    <TableCell><Badge variant="outline">Miễn phí</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard">Kiểm tra</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </section>

        {/* 6. Badges & Avatars */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">6. Badges & Avatar Primitives</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Badges Thẻ Phân loại</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="default">Primary / Full Test</Badge>
                <Badge variant="secondary">Secondary / Draft</Badge>
                <Badge variant="success">Success / Verified</Badge>
                <Badge variant="warning">Warning / Revision</Badge>
                <Badge variant="destructive">Destructive / Rejected</Badge>
                <Badge variant="outline">Outline / Part 5</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avatar Người dùng & Vai trò</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="font-semibold">Học viên</p>
                    <p className="text-muted-foreground">student@toeicpath.ai</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Avatar className="border-2 border-emerald-500/30">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold">TC</AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="font-semibold">Giảng viên</p>
                    <p className="text-muted-foreground">teacher@toeicpath.ai</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 7. HTTP Client & Backend API Health Monitor */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              7. HTTP Client & Backend Health Monitor
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={isHealthFetching}
              className="gap-1.5"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isHealthFetching ? "animate-spin" : ""}`} />
              Làm mới trạng thái
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {isHealthLoading ? (
                    <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                  ) : isHealthError ? (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Wifi className="h-4 w-4 text-emerald-500" />
                  )}
                  Trạng thái Kết nối API
                </CardTitle>
                <CardDescription>
                  Kiểm tra realtime qua TanStack Query & Axios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Server API:</span>
                  {isHealthLoading ? (
                    <Badge variant="secondary">Đang kết nối...</Badge>
                  ) : isHealthError ? (
                    <Badge variant="destructive">Không khả dụng (Offline)</Badge>
                  ) : (
                    <Badge variant="success">Hoạt động (Online)</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base URL:</span>
                  <span className="font-mono text-xs text-foreground truncate max-w-[140px]">
                    {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}
                  </span>
                </div>

                {health && (
                  <div className="rounded-md bg-muted p-2 text-xs font-mono space-y-1">
                    <p>Uptime: {Math.floor(health.uptime)}s</p>
                    <p>Version: {health.version}</p>
                    <p className="truncate">Time: {health.timestamp}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Mô phỏng Kiểm tra Interceptor & Xử lý Lỗi</CardTitle>
                <CardDescription>
                  Gọi API qua apiClient wrapper để xác thực chuẩn hóa lỗi `ApiError` và thông báo qua Sonner Toast
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestApi("health")}
                    disabled={apiTesting}
                    className="gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Test 200 OK
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestApi("400")}
                    disabled={apiTesting}
                    className="gap-1 text-xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Test 400 Bad
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestApi("401")}
                    disabled={apiTesting}
                    className="gap-1 text-xs"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                    Test 401 Auth
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestApi("500")}
                    disabled={apiTesting}
                    className="gap-1 text-xs"
                  >
                    <WifiOff className="h-3.5 w-3.5 text-destructive" />
                    Test 500 Crash
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Mỗi yêu cầu HTTP được tự động kèm Bearer Token từ client session, chuẩn hóa lỗi server và thông báo tức thời.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 8. Error Boundary & Access Control */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            8. Error Boundary Cục bộ & Quyền Truy cập
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Component Error Boundary (Isolated)</CardTitle>
                <CardDescription>
                  Bắt lỗi runtime tại từng khối component mà không làm sập toàn bộ ứng dụng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <BuggyCounter />
                </ErrorBoundary>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base">Màn hình Phân quyền (401/403)</CardTitle>
                <CardDescription>
                  Giao diện chuẩn khi người dùng không đủ quyền truy cập tài nguyên bảo mật
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Trang `/unauthorized` hiển thị cảnh báo thân thiện, cung cấp đường dẫn quay về Dashboard hoặc chuyển đổi tài khoản.
                </p>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href="/unauthorized">
                    <ShieldAlert className="h-4 w-4" />
                    Xem Trang Unauthorized (/unauthorized)
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

