"use client";

import { useQuery } from "@tanstack/react-query";
import { examsService } from "@/services/exams.service";

export function useLandingSummary() {
  return useQuery({
    queryKey: ["exams", "landing-summary"],
    queryFn: () => examsService.getLandingSummary(),
    staleTime: 60_000,
    retry: 1,
  });
}
