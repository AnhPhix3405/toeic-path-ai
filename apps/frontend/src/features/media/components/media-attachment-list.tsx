'use client';

import React, { useState } from 'react';
import {
  Music,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AudioPlayer } from './audio-player';
import { ImageLightbox } from './image-lightbox';
import { cn } from '@/lib/utils';
import type { MediaResource, UpdateMediaTargetDto } from '@/types/media';
import type { QuestionStatus } from '@/types/question';

export interface MediaAttachmentListProps {
  mediaItems: MediaResource[];
  parentStatus?: QuestionStatus;
  isLoading?: boolean;
  onDelete?: (id: string) => Promise<void>;
  onUpdateTarget?: (id: string, target: UpdateMediaTargetDto) => Promise<void>;
  canModify?: boolean;
  className?: string;
}

export function isMediaModificationAllowed(status?: QuestionStatus): boolean {
  if (!status) return true;
  return status === 'draft' || status === 'revision_requested';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaAttachmentList({
  mediaItems,
  parentStatus,
  isLoading = false,
  onDelete,
  onUpdateTarget,
  canModify,
  className,
}: MediaAttachmentListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Whitelist rule BR13.4, E4
  const isAllowed = canModify ?? isMediaModificationAllowed(parentStatus);
  const disabledReason =
    !isAllowed
      ? 'Không thể sửa hoặc xóa tài nguyên khi câu hỏi đang chờ duyệt hoặc đã xuất bản.'
      : undefined;

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <div className="p-6 text-center border rounded-xl bg-card text-muted-foreground text-sm">
        Chưa có tài nguyên âm thanh hoặc hình ảnh nào được đính kèm.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-3">
        {mediaItems.map((item) => (
          <div
            key={item.id}
            className="border rounded-xl p-3 bg-card shadow-xs space-y-3 transition-colors hover:border-primary/40"
          >
            {/* Header: Type icon, filename, size, and actions */}
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    item.resourceType === 'audio'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  )}
                >
                  {item.resourceType === 'audio' ? (
                    <Music className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {item.fileName}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {formatBytes(item.fileSize)} • {item.mimeType}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  title="Mở liên kết gốc"
                  aria-label="Mở liên kết gốc"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div title={disabledReason}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={!isAllowed || isDeleting || !onDelete}
                    onClick={() => setDeleteTargetId(item.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Xóa tài nguyên"
                  >
                    {!isAllowed ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Embedded Player / Viewer */}
            <div className="pt-1">
              {item.resourceType === 'audio' ? (
                <AudioPlayer
                  src={item.fileUrl}
                  fileName={item.fileName}
                  variant="standard"
                />
              ) : (
                <div className="max-w-md">
                  <ImageLightbox
                    src={item.fileUrl}
                    fileName={item.fileName}
                    fileSize={item.fileSize}
                    showMetadataBadge={false}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Xác nhận xóa tài nguyên
            </DialogTitle>
            <DialogDescription>
              Hành động này sẽ gỡ bỏ tài nguyên đa phương tiện khỏi câu hỏi/nhóm câu hỏi và đánh dấu xóa mềm trên hệ thống lưu trữ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetId(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
