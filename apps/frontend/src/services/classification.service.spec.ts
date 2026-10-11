import { describe, it, expect, vi, beforeEach } from "vitest";
import { classificationService } from "./classification.service";
import apiClient from "./api-client";

vi.mock("./api-client", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("classificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps direct array response from /toeic-parts", async () => {
    const mockParts = [
      { id: "p-1", partNumber: 1, name: "Photographs", description: null },
      { id: "p-2", partNumber: 2, name: "Question-Response", description: null },
    ];
    // Backend returns the array directly
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockParts as any);

    const result = await classificationService.getToeicParts();
    expect(apiClient.get).toHaveBeenCalledWith("/toeic-parts");
    expect(result).toEqual(mockParts);
    expect(result).not.toBeUndefined();
  });

  it("unwraps wrapped response { data: [...] } from /toeic-parts", async () => {
    const mockParts = [
      { id: "p-1", partNumber: 1, name: "Photographs", description: null },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockParts } as any);

    const result = await classificationService.getToeicParts();
    expect(result).toEqual(mockParts);
  });

  it("returns empty array and never undefined when response is null or undefined", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(null as any);
    const result = await classificationService.getToeicParts();
    expect(result).toEqual([]);
    expect(result).not.toBeUndefined();
  });

  it("unwraps /topics and /skills arrays directly", async () => {
    const mockTopics = [{ id: "t-1", name: "Business", description: null }];
    const mockSkills = [{ id: "s-1", name: "Skimming", description: null }];

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockTopics as any);
    const topics = await classificationService.getTopics();
    expect(topics).toEqual(mockTopics);

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockSkills as any);
    const skills = await classificationService.getSkills();
    expect(skills).toEqual(mockSkills);
  });
});
