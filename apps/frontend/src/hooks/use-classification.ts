import { useQuery } from "@tanstack/react-query";
import { classificationService } from "@/services/classification.service";

export function useToeicParts() {
  return useQuery({
    queryKey: ["toeic-parts"],
    queryFn: async () => {
      const parts = await classificationService.getToeicParts();
      return parts ?? [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache for catalog
  });
}

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const topics = await classificationService.getTopics();
      return topics ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const skills = await classificationService.getSkills();
      return skills ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });
}
