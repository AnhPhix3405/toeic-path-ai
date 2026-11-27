"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { useLandingSummary } from "@/features/home/hooks/use-landing-summary";
import { HeroSection } from "./hero-section";
import { FeaturedExamsSection } from "./featured-exams-section";
import { LiveFeaturesBento } from "./live-features-bento";
import { UpcomingRoadmapSection } from "./upcoming-roadmap-section";

export function HomePageClient() {
  const { data, isLoading, isFetching, isError, refetch } = useLandingSummary();

  return (
    <PublicLayout>
      <HeroSection stats={data?.stats} isLoading={isLoading} />
      <FeaturedExamsSection
        exams={data?.featuredExams ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRefresh={() => {
          void refetch();
        }}
      />
      <LiveFeaturesBento />
      <UpcomingRoadmapSection />
    </PublicLayout>
  );
}
