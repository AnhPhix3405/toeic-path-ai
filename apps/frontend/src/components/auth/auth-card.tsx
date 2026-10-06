import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  switchText?: string;
  switchActionText?: string;
  switchHref?: string;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  switchText,
  switchActionText,
  switchHref,
  className,
}: AuthCardProps) {
  return (
    <Card className={cn("w-full max-w-md shadow-lg border-border/80", className)}>
      <CardHeader className="space-y-2 text-center pb-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
          <Sparkles className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
      </CardContent>

      {switchText && switchActionText && switchHref && (
        <CardFooter className="flex justify-center border-t border-border/50 pt-4 pb-6">
          <p className="text-sm text-muted-foreground">
            {switchText}{" "}
            <Link
              href={switchHref}
              className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
            >
              {switchActionText}
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
