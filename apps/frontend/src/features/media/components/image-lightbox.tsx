'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  Download,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ImageLightboxProps {
  src: string;
  alt?: string;
  fileName?: string;
  fileSize?: number;
  className?: string;
  thumbnailClassName?: string;
  showMetadataBadge?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageLightbox({
  src,
  alt = 'Hình ảnh câu hỏi TOEIC',
  fileName,
  fileSize,
  className,
  thumbnailClassName,
  showMetadataBadge = false,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%
  const [hasError, setHasError] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetZoom();
    }
  }, [isOpen]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 text-destructive text-sm gap-2',
          className,
        )}
        role="alert"
      >
        <AlertCircle className="w-8 h-8 opacity-80" />
        <p className="font-medium text-center">Không thể tải hình ảnh</p>
        <p className="text-xs text-muted-foreground text-center">
          Tệp ảnh có thể đã bị xóa hoặc đường dẫn không hợp lệ.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative group inline-block', className)}>
      {/* Thumbnail Card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer',
          thumbnailClassName,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-auto max-h-72 object-contain bg-muted/20"
        />

        {/* Hover overlay button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-sm backdrop-blur-[2px] cursor-pointer"
          aria-label="Phóng to ảnh"
        >
          <Maximize2 className="w-5 h-5" />
          <span>Xem ảnh lớn</span>
        </button>

        {/* Footer info badge */}
        {(fileName || fileSize || showMetadataBadge) && (
          <div className="p-2 border-t bg-card/90 flex items-center justify-between text-xs gap-2">
            <span className="font-medium truncate text-foreground text-[12px] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {fileName || 'image.png'}
            </span>
            {fileSize && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-mono">
                {formatBytes(fileSize)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[95vw] w-full max-h-[92vh] h-full p-0 overflow-hidden bg-background/95 backdrop-blur-md flex flex-col border-border/80 shadow-2xl rounded-2xl"
          role="dialog"
          aria-label="Xem chi tiết hình ảnh"
        >
          {/* Header Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 shrink-0">
            <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span>{fileName || alt || 'Chi tiết hình ảnh'}</span>
              {fileSize && (
                <span className="text-xs text-muted-foreground font-normal font-mono">
                  ({formatBytes(fileSize)})
                </span>
              )}
            </DialogTitle>

            <div className="flex items-center gap-1.5">
              {/* Zoom controls */}
              <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 mr-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  aria-label="Thu nhỏ (-25%)"
                  title="Thu nhỏ"
                  className="h-6 w-6"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>

                <span className="text-xs font-mono font-medium px-2 min-w-[45px] text-center select-none">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  aria-label="Phóng to (+25%)"
                  title="Phóng to"
                  className="h-6 w-6"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={resetZoom}
                  disabled={zoomLevel === 1 && panPosition.x === 0 && panPosition.y === 0}
                  aria-label="Đặt lại thu phóng"
                  title="Đặt lại về 100%"
                  className="h-6 w-6"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>

              {/* Download original */}
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                download={fileName || 'image.png'}
                className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium rounded-md border hover:bg-accent transition-colors gap-1.5"
                title="Tải tệp ảnh về"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về</span>
              </a>

              {/* Close Button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng xem ảnh"
                title="Đóng xem ảnh"
                className="rounded-full ml-1 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Image Display Area with Pan & Zoom */}
          <div
            className={cn(
              'flex-1 flex items-center justify-center p-4 overflow-hidden relative select-none',
              zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 150ms ease-out',
              }}
              draggable={false}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-lg pointer-events-auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
