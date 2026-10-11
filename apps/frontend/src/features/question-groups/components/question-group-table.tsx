"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Edit2,
  Eye,
  FileQuestion,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteQuestionGroup, useQuestionGroups } from "@/hooks/use-question-groups";
import { QuestionGroup } from "@/types/question";

export function QuestionGroupTable() {
  const { data: groups, isLoading } = useQuestionGroups();
  const deleteMutation = useDeleteQuestionGroup();

  const [groupToDelete, setGroupToDelete] = useState<QuestionGroup | null>(null);

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    await deleteMutation.mutateAsync(groupToDelete.id);
    setGroupToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const groupList = groups || [];

  if (groupList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Chưa có nhóm câu hỏi nào
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          Tạo nhóm câu hỏi để quản lý các bài đọc, bài hội thoại và chuỗi câu hỏi con trong Part 3, 4, 6 và 7.
        </p>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
          <Link href="/question-groups/create">
            <Plus className="w-4 h-4 mr-2" />
            Tạo nhóm câu hỏi mới
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
            <TableRow>
              <TableHead className="w-[260px] font-semibold text-slate-700 dark:text-slate-300">
                Tiêu đề nhóm bài đọc
              </TableHead>
              <TableHead className="min-w-[320px] font-semibold text-slate-700 dark:text-slate-300">
                Trích đoạn bài đọc (Context)
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-slate-700 dark:text-slate-300">
                Số câu hỏi con
              </TableHead>
              <TableHead className="w-[130px] font-semibold text-slate-700 dark:text-slate-300">
                Ngày tạo
              </TableHead>
              <TableHead className="w-[80px] text-right font-semibold text-slate-700 dark:text-slate-300">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupList.map((group) => {
              const childCount = group.questions?.length || 0;

              return (
                <TableRow
                  key={group.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Title */}
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <Link
                      href={`/question-groups/${group.id}`}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
                    >
                      {group.title || "Nhóm bài đọc không tiêu đề"}
                    </Link>
                  </TableCell>

                  {/* Context snippet */}
                  <TableCell>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {group.context}
                    </p>
                  </TableCell>

                  {/* Child count */}
                  <TableCell>
                    <span className="inline-flex items-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                      <FileQuestion className="w-3.5 h-3.5 mr-1" />
                      {childCount} câu hỏi
                    </span>
                  </TableCell>

                  {/* Created At */}
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(group.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          aria-label="Tùy chọn thao tác nhóm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/question-groups/${group.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Xem chi tiết
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/question-groups/${group.id}/edit`}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Chỉnh sửa
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setGroupToDelete(group)}
                          className="text-rose-600 focus:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa nhóm
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(groupToDelete)}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Xác nhận xóa nhóm câu hỏi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Hành động này sẽ xóa nhóm bài đọc này. Các câu hỏi con liên kết sẽ được tách ra thành câu hỏi độc lập và không bị xóa khỏi hệ thống.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGroupToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Xóa nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
