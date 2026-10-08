"use client";

import * as React from "react";
import { Mail, Calendar, ShieldCheck, GraduationCap, School } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileResponse } from "@/types/api";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  profileData: ProfileResponse;
  className?: string;
}

export function ProfileHeader({ profileData, className }: ProfileHeaderProps) {
  const { email, role, profile, updatedAt } = profileData;

  const roleMeta = {
    student: {
      label: "Học viên",
      icon: GraduationCap,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    teacher: {
      label: "Giảng viên",
      icon: School,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    admin: {
      label: "Quản trị viên",
      icon: ShieldCheck,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    guest: {
      label: "Khách vãng lai",
      icon: GraduationCap,
      className: "bg-muted text-muted-foreground border-border",
    },
  }[role] || {
    label: "Người dùng",
    icon: GraduationCap,
    className: "bg-muted text-muted-foreground border-border",
  };

  const RoleIcon = roleMeta.icon;

  const formattedDate = React.useMemo(() => {
    if (!updatedAt) return "";
    try {
      const date = new Date(updatedAt);
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return updatedAt;
    }
  }, [updatedAt]);

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-xs", className)}>
      <div className="h-24 sm:h-28 bg-gradient-to-r from-primary/15 via-primary/5 to-accent/20 border-b border-border/50" />
      <CardContent className="relative pt-0 pb-6 px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {profile.fullName || "Người dùng"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>{email}</span>
              </div>
              {formattedDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Cập nhật: {formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("gap-1.5 px-3 py-1 text-xs font-semibold rounded-full", roleMeta.className)}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {roleMeta.label}
            </Badge>
          </div>
        </div>

        {profile.bio && (
          <div className="rounded-lg bg-accent/40 p-3 text-xs text-foreground/90 border border-border/40">
            <p className="line-clamp-3 italic">&ldquo;{profile.bio}&rdquo;</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfileHeader;
