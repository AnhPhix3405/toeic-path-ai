"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  showStrengthMeter?: boolean;
}

export interface PasswordStrength {
  score: number; // 0 - 4
  label: string;
  color: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", color: "bg-muted" };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Yếu", color: "bg-destructive" };
    case 2:
      return { score: 2, label: "Trung bình", color: "bg-amber-500" };
    case 3:
      return { score: 3, label: "Khá", color: "bg-blue-500" };
    case 4:
      return { score: 4, label: "Rất mạnh", color: "bg-emerald-500" };
    default:
      return { score: 1, label: "Yếu", color: "bg-destructive" };
  }
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showStrengthMeter = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(
      typeof value === "string" ? value : ""
    );

    const currentValue = typeof value === "string" ? value : internalValue;
    const strength = calculatePasswordStrength(currentValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-2">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 pr-10 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-destructive text-destructive focus-visible:ring-destructive"
                : "border-input",
              className
            )}
            ref={ref}
            value={value}
            onChange={handleChange}
            aria-invalid={error ? "true" : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {showStrengthMeter && currentValue.length > 0 && (
          <div className="space-y-1.5" data-testid="password-strength-meter">
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    step <= strength.score ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Độ mạnh mật khẩu:</span>
              <span
                className={cn(
                  "font-medium",
                  strength.score === 1 && "text-destructive",
                  strength.score === 2 && "text-amber-500",
                  strength.score === 3 && "text-blue-500",
                  strength.score === 4 && "text-emerald-500"
                )}
              >
                {strength.label}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
