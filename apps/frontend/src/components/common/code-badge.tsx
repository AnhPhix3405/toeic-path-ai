"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CodeBadgeProps {
  code: string;
  label?: string;
  copyable?: boolean;
  className?: string;
}

export function CodeBadge({
  code,
  label,
  copyable = true,
  className,
}: CodeBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Đã sao chép mã ${code}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép vào bộ nhớ tạm.");
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-full",
        className
      )}
    >
      {label && <span className="text-slate-400 font-sans">{label}</span>}
      <span className="truncate">{code}</span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Sao chép mã ${code}`}
          title={`Sao chép mã ${code}`}
          className="ml-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </span>
  );
}
