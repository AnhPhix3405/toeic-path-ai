'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Music,
  Image as ImageIcon,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mediaService } from '@/services/media.service';
import type { MediaResource } from '@/types/media';

export interface MediaUploadDropzoneProps {
  acceptType?: 'audio' | 'image' | 'all';
  target?: {
    questionId?: string | null;
    questionGroupId?: string | null;
  };
  maxFiles?: number;
  disabled?: boolean;
  disabledReason?: string;
  onUploadSuccess?: (uploaded: MediaResource[]) => void;
  className?: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
  result?: MediaResource;
}

export function MediaUploadDropzone({
  acceptType = 'all',
  target,
  maxFiles = 10,
  disabled = false,
  disabledReason,
  onUploadSuccess,
  className,
}: MediaUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Revoke object URLs on unmount to prevent memory leaks (PM Point 2)
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [queue]);

  const getAcceptString = () => {
    if (acceptType === 'audio') return '.mp3,.wav,audio/mpeg,audio/wav';
    if (acceptType === 'image') return '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    return '.mp3,.wav,.jpg,.jpeg,.png,.webp,audio/mpeg,audio/wav,image/jpeg,image/png,image/webp';
  };

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled) return;

      const files = Array.from(fileList).slice(0, maxFiles);
      if (files.length === 0) return;

      const newItems: UploadQueueItem[] = [];

      for (const file of files) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const expectedType =
          acceptType === 'all'
            ? ['.mp3', '.wav'].includes(ext)
              ? 'audio'
              : 'image'
            : acceptType;

        const validation = mediaService.validateMediaFile(file, expectedType);
        if (!validation.isValid) {
          toast.error(validation.error || 'Tệp không hợp lệ.');
          continue;
        }

        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        const item: UploadQueueItem = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl,
          progress: 0,
          status: 'pending',
        };
        newItems.push(item);
      }

      if (newItems.length === 0) return;

      setQueue((prev) => [...prev, ...newItems]);

      // Process upload sequentially or in parallel
      const completedResults: MediaResource[] = [];

      for (const item of newItems) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q)),
        );

        try {
          const result = await mediaService.orchestratedUploadFlow(item.file, {
            target,
            onProgress: (percent) => {
              setQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q)),
              );
            },
          });

          completedResults.push(result);

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'success', progress: 100, result } : q,
            ),
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Lỗi không xác định khi tải tệp lên máy chủ.';
          toast.error(`Tải lên tệp ${item.file.name} thất bại: ${msg}`);
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'error', errorMsg: msg } : q)),
          );
        }
      }

      if (completedResults.length > 0) {
        toast.success(`Tải lên thành công ${completedResults.length} tệp tài nguyên.`);
        onUploadSuccess?.(completedResults);
      }
    },
    [acceptType, disabled, maxFiles, onUploadSuccess, target],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((q) => q.id !== id);
    });
  };

  const retryItem = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: 'uploading', progress: 0, errorMsg: undefined } : q)),
    );

    try {
      const result = await mediaService.orchestratedUploadFlow(item.file, {
        target,
        onProgress: (percent) => {
          setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, progress: percent } : q)));
        },
      });

      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'success', progress: 100, result } : q)),
      );

      toast.success(`Tải lên thành công: ${item.file.name}`);
      onUploadSuccess?.([result]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải lên thất bại';
      toast.error(msg);
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'error', errorMsg: msg } : q)),
      );
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer select-none text-center',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card',
          disabled && 'opacity-60 cursor-not-allowed hover:border-border hover:bg-card',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          data-testid="media-file-input"
          accept={getAcceptString()}
          multiple={maxFiles > 1}
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        {disabled ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Khu vực tải lên bị khóa</p>
            {disabledReason && (
              <p className="text-xs text-amber-600 dark:text-amber-400 max-w-sm">
                {disabledReason}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Kéo thả tệp vào đây hoặc <span className="text-primary underline">chọn từ thiết bị</span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Music className="w-3.5 h-3.5" /> Audio ≤ 15MB (.mp3, .wav)
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Hình ảnh ≤ 5MB (.jpg, .png, .webp)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Upload Queue Progress */}
      {queue.length > 0 && (
        <div className="space-y-2 border rounded-xl p-3 bg-card/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-medium">
            <span>Tiến trình tải lên ({queue.length} tệp)</span>
            <button
              type="button"
              onClick={() => {
                queue.forEach((q) => q.previewUrl && URL.revokeObjectURL(q.previewUrl));
                setQueue([]);
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Xóa danh sách
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-background text-xs shadow-xs"
              >
                {/* File icon / preview */}
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : item.file.type.startsWith('audio/') ? (
                    <Music className="w-4 h-4 text-primary" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Progress details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate text-foreground">{item.file.name}</p>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  {item.status === 'uploading' && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === 'error' && (
                    <p className="text-[11px] text-destructive truncate">{item.errorMsg}</p>
                  )}
                </div>

                {/* Status action icon */}
                <div className="shrink-0 flex items-center gap-1">
                  {item.status === 'uploading' && (
                    <span className="text-[11px] font-mono text-primary font-medium flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {item.progress}%
                    </span>
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {item.status === 'error' && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => retryItem(item.id)}
                      title="Thử lại"
                      className="h-7 w-7"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeQueueItem(item.id)}
                    title="Xóa khỏi hàng đợi"
                    className="h-7 w-7"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
