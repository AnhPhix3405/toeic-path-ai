"use client";

import * as React from "react";
import { Camera, Trash2, UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  fullName: string;
  className?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  fullName,
  className,
}: AvatarUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  const isUploading = uploadAvatarMutation.isPending;
  const isDeleting = deleteAvatarMutation.isPending;

  // Cleanup object URL to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const validateAndUpload = async (file: File) => {
    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Định dạng tệp không hợp lệ", {
        description: "Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP.",
      });
      return;
    }

    // 2. Validate File size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Dung lượng tệp quá lớn", {
        description: "Kích thước ảnh tối đa cho phép là 2MB.",
      });
      return;
    }

    // 3. Create temporary preview & revoke previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);

    // 4. Send upload request
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } catch {
      // Error handled by mutation toast
    } finally {
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      setIsDeleteDialogOpen(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  const displayedImage = previewUrl || currentAvatarUrl || undefined;

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Tải lên ảnh đại diện"
        onChange={handleFileChange}
        disabled={isUploading || isDeleting}
      />

      {/* Avatar Display & Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex h-28 w-28 sm:h-32 sm:w-32 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isDragging
            ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-105"
            : "border-border/80 hover:border-primary/60 hover:shadow-md"
        )}
        role="button"
        tabIndex={0}
        aria-label="Bấm hoặc kéo thả ảnh để đổi ảnh đại diện"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Avatar className="h-full w-full rounded-full ring-2 ring-background">
          <AvatarImage
            src={displayedImage}
            alt={fullName || "Ảnh đại diện"}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Hover / Loading Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white transition-opacity duration-200",
            isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          ) : (
            <>
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-[11px] font-medium tracking-tight">Đổi ảnh</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons & Help Text */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Tải ảnh mới
          </Button>

          {currentAvatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isUploading || isDeleting}
              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              aria-label="Xóa ảnh đại diện"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa ảnh
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Định dạng: JPG, PNG, WebP • Tối đa 2MB
        </p>
      </div>

      {/* Confirmation Dialog for Deleting Avatar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Xóa ảnh đại diện?</DialogTitle>
            <DialogDescription className="text-center">
              Ảnh đại diện của bạn sẽ bị gỡ bỏ và chuyển về chữ cái đầu mặc định. Bạn có thể tải lên ảnh mới bất kỳ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAvatar}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AvatarUpload;
