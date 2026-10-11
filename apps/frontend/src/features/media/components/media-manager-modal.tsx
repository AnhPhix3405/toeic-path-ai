'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MediaUploadDropzone } from './media-upload-dropzone';
import { MediaAttachmentList } from './media-attachment-list';
import {
  useQuestionMedia,
  useQuestionGroupMedia,
  useDeleteMedia,
  useUpdateMediaTarget,
} from '@/hooks/use-media';
import { FolderPlus, Layers, Film } from 'lucide-react';
import type { QuestionStatus } from '@/types/question';

export interface MediaManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    questionId?: string | null;
    questionGroupId?: string | null;
  };
  parentStatus?: QuestionStatus;
  title?: string;
}

export function MediaManagerModal({
  open,
  onOpenChange,
  target,
  parentStatus,
  title = 'Quản lý tài nguyên đa phương tiện (Audio / Hình ảnh)',
}: MediaManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');

  const questionMediaQuery = useQuestionMedia(target.questionId);
  const groupMediaQuery = useQuestionGroupMedia(target.questionGroupId);
  const deleteMutation = useDeleteMedia();
  const updateTargetMutation = useUpdateMediaTarget();

  const isGroup = Boolean(target.questionGroupId);
  const currentQuery = isGroup ? groupMediaQuery : questionMediaQuery;
  const mediaItems = currentQuery.data || [];
  const isLoading = currentQuery.isLoading;

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Film className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Đính kèm các tệp âm thanh nghe TOEIC (Audio $\le$ 15MB) hoặc hình ảnh minh họa (Image $\le$ 5MB).
          </DialogDescription>

          {/* Simple Tab Switcher */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'list' ? 'default' : 'outline'}
              onClick={() => setActiveTab('list')}
              className="h-8 text-xs gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Đã đính kèm ({mediaItems.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'upload' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upload')}
              className="h-8 text-xs gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Tải lên mới
            </Button>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'list' ? (
            <MediaAttachmentList
              mediaItems={mediaItems}
              parentStatus={parentStatus}
              isLoading={isLoading}
              onDelete={handleDelete}
            />
          ) : (
            <div className="space-y-4">
              <MediaUploadDropzone
                target={target}
                acceptType="all"
                onUploadSuccess={() => {
                  currentQuery.refetch();
                  setActiveTab('list');
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
