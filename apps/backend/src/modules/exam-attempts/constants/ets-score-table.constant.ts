/**
 * Bảng quy đổi điểm chuẩn ETS TOEIC (0..100 câu đúng -> 5..495 điểm, bội số của 5).
 */
export const ETS_LISTENING_SCORE_TABLE: readonly number[] = [
  5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 115, 120, 125, 130, 135, 140, 145, 150, 160, 165, 170, 175, 180, 185, 190, 195, 200, 210,
  215, 220, 230, 240, 245, 250, 255, 260, 270, 275, 280, 290, 295, 300, 310, 315, 320, 325, 330,
  340, 345, 350, 360, 365, 370, 380, 385, 390, 395, 400, 405, 410, 420, 425, 430, 440, 445, 450,
  455, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495,
];

export const ETS_READING_SCORE_TABLE: readonly number[] = [
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 95,
  100, 110, 115, 120, 125, 130, 140, 145, 150, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205,
  210, 220, 225, 230, 235, 240, 250, 255, 260, 270, 275, 280, 285, 290, 295, 300, 310, 320, 325,
  330, 335, 340, 350, 355, 360, 365, 370, 375, 385, 390, 395, 400, 405, 415, 420, 425, 430, 435,
  440, 450, 455, 460, 470, 475, 480, 485, 490, 490, 495, 495, 495, 495, 495, 495, 495,
];

function clampRawScore(scaledRaw: number): number {
  if (!Number.isFinite(scaledRaw)) {
    return 0;
  }
  const rounded = Math.round(scaledRaw);
  return Math.max(0, Math.min(100, rounded));
}

export function convertRawToEtsListening(scaledRaw: number): number {
  const index = clampRawScore(scaledRaw);
  return ETS_LISTENING_SCORE_TABLE[index] ?? 5;
}

export function convertRawToEtsReading(scaledRaw: number): number {
  const index = clampRawScore(scaledRaw);
  return ETS_READING_SCORE_TABLE[index] ?? 5;
}
