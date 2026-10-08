import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* Header Banner Skeleton */}
      <Card className="overflow-hidden border-border/60">
        <Skeleton className="h-28 w-full rounded-none" />
        <CardContent className="pt-0 pb-6 px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-8 mb-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Account Meta Skeleton */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-4">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Form Skeleton */}
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-28 w-full rounded-md" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
