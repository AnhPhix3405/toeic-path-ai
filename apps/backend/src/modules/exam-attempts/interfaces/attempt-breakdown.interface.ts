export interface PartBreakdownItem {
  partNumber: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  avgTimeSeconds: number;
}

export interface SkillBreakdownItem {
  skillId: string;
  skillCode: string;
  skillName: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
}
