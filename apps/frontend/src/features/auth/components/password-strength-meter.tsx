"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordStrengthMeterProps {
  password: string;
}

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const requirements: RequirementItem[] = React.useMemo(() => {
    return [
      {
        id: "length",
        label: "Tối thiểu 12 ký tự",
        met: password.length >= 12,
      },
      {
        id: "uppercase",
        label: "Có ít nhất 1 chữ in hoa (A-Z)",
        met: /[A-Z]/.test(password),
      },
      {
        id: "lowercase",
        label: "Có ít nhất 1 chữ in thường (a-z)",
        met: /[a-z]/.test(password),
      },
      {
        id: "number_or_special",
        label: "Có ít nhất 1 số (0-9) & 1 ký tự đặc biệt (!@#...)",
        met: /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password),
      },
    ];
  }, [password]);

  const metCount = requirements.filter((r) => r.met).length;

  const strengthInfo = React.useMemo(() => {
    if (!password) return { label: "", color: "bg-muted", score: 0 };
    if (metCount <= 1) return { label: "Yếu", color: "bg-destructive", textClass: "text-destructive", score: 1 };
    if (metCount === 2) return { label: "Trung bình", color: "bg-amber-500", textClass: "text-amber-500", score: 2 };
    if (metCount === 3) return { label: "Khá", color: "bg-blue-500", textClass: "text-blue-500", score: 3 };
    return { label: "Rất mạnh", color: "bg-emerald-500", textClass: "text-emerald-500", score: 4 };
  }, [metCount, password]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1" data-testid="password-strength-meter">
      {/* 4 Segment Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full rounded-full transition-all duration-300",
              step <= strengthInfo.score ? strengthInfo.color : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Độ mạnh mật khẩu:</span>
        <span className={cn("font-medium", strengthInfo.textClass)}>
          {strengthInfo.label}
        </span>
      </div>

      {/* Checklist of requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
        {requirements.map((req) => (
          <div
            key={req.id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              req.met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
