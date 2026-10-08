"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { updateProfileSchema, type UpdateProfileFormValues } from "@/lib/validations/profile.schema";
import { useUpdateProfile } from "@/hooks/use-profile";
import { parseApiError } from "@/services/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileResponse } from "@/types/api";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  profileData: ProfileResponse;
  className?: string;
}

export function ProfileForm({ profileData, className }: ProfileFormProps) {
  const { profile, email, role, userId } = profileData;
  const updateMutation = useUpdateProfile();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const defaultValues: UpdateProfileFormValues = React.useMemo(
    () => ({
      fullName: profile.fullName || "",
      birthday: profile.birthday || null,
      gender: profile.gender || null,
      bio: profile.bio || null,
    }),
    [profile]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
    mode: "onBlur",
  });

  // Re-sync form default values when profileData changes (e.g. after refresh or query update)
  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchedGender = watch("gender");
  const watchedBio = watch("bio") || "";
  const bioLength = watchedBio.length;

  const todayIsoDate = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const onSubmit = async (data: UpdateProfileFormValues) => {
    setApiError(null);
    try {
      await updateMutation.mutateAsync({
        fullName: data.fullName,
        birthday: data.birthday || null,
        gender: data.gender || null,
        bio: data.bio || null,
      });
      // Reset form dirty state with latest submitted values
      reset(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setApiError(parsed.message);
    }
  };

  const handleReset = () => {
    reset(defaultValues);
    setApiError(null);
  };

  const isPending = isSubmitting || updateMutation.isPending;

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
            Thông Tin Cá Nhân
          </CardTitle>
          <CardDescription>
            Cập nhật họ tên, thông tin liên hệ và mục tiêu học tập của bạn.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="fullName"
                className="text-sm font-semibold text-foreground flex items-center justify-between"
              >
                <span>
                  Họ và tên <span className="text-destructive">*</span>
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  (1 - 150 ký tự)
                </span>
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nhập họ và tên đầy đủ của bạn"
                disabled={isPending}
                error={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Birthday & Gender Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Birthday */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="birthday"
                  className="text-sm font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Ngày sinh</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    (Không ở tương lai)
                  </span>
                </label>
                <Input
                  id="birthday"
                  type="date"
                  max={todayIsoDate}
                  disabled={isPending}
                  error={!!errors.birthday}
                  {...register("birthday")}
                />
                {errors.birthday && (
                  <p className="text-xs text-destructive mt-1" role="alert">
                    {errors.birthday.message}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="gender"
                  className="text-sm font-semibold text-foreground"
                >
                  Giới tính
                </label>
                <Select
                  value={watchedGender ?? "none"}
                  onValueChange={(val) => {
                    const mapped = val === "none" ? null : (val as "male" | "female" | "other");
                    setValue("gender", mapped, { shouldDirty: true, shouldValidate: true });
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa thiết lập</SelectItem>
                    <SelectItem value="male">Nam (Male)</SelectItem>
                    <SelectItem value="female">Nữ (Female)</SelectItem>
                    <SelectItem value="other">Khác (Other)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-xs text-destructive mt-1" role="alert">
                    {errors.gender.message}
                  </p>
                )}
              </div>
            </div>

            {/* Bio / Learning Goals */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bio"
                  className="text-sm font-semibold text-foreground"
                >
                  Tiểu sử & Mục tiêu học tập
                </label>
                <span
                  className={cn(
                    "text-xs",
                    bioLength > 500
                      ? "text-destructive font-bold"
                      : "text-muted-foreground"
                  )}
                >
                  {bioLength} / 500
                </span>
              </div>
              <Textarea
                id="bio"
                placeholder="Chia sẻ mục tiêu điểm TOEIC của bạn, điểm mạnh, điểm yếu hoặc lý do học tập..."
                rows={4}
                disabled={isPending}
                className={cn("resize-none", errors.bio && "border-destructive focus-visible:ring-destructive")}
                {...register("bio")}
              />
              {errors.bio && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  {errors.bio.message}
                </p>
              )}
            </div>

            {/* Action Bar with Dirty State */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Có thay đổi chưa lưu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Dữ liệu đã được lưu
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!isDirty || isPending}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Hủy bỏ
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!isDirty || isPending}
                  className="gap-1.5 text-xs font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Details Card (Read-Only) */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            Thông Tin Tài Khoản
          </CardTitle>
          <CardDescription>
            Các thông tin định danh và bảo mật do hệ thống quản lý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg bg-muted/40 p-3 border border-border/40">
              <p className="text-muted-foreground font-medium mb-1">Địa chỉ Email</p>
              <p className="font-semibold text-foreground truncate">{email}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border/40">
              <p className="text-muted-foreground font-medium mb-1">Vai trò hệ thống</p>
              <p className="font-semibold text-foreground capitalize">{role}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border/40">
              <p className="text-muted-foreground font-medium mb-1">Mã người dùng (User ID)</p>
              <p className="font-mono text-muted-foreground truncate" title={userId}>
                {userId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileForm;
