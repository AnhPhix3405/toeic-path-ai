import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { Question } from '../../questions/entities/question.entity';
import { Skill } from '../../questions/entities/skill.entity';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ScoreConversionType } from '../../exams/enums/score-conversion-type.enum';
import { PartBreakdownItem, SkillBreakdownItem } from '../interfaces/attempt-breakdown.interface';
import {
  convertRawToEtsListening,
  convertRawToEtsReading,
} from '../constants/ets-score-table.constant';

interface PartAccumulator {
  partNumber: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalTimeSpentSeconds: number;
}

interface SkillAccumulator {
  skillId: string;
  skillCode: string;
  skillName: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
}

@Injectable()
export class ExamAttemptsGradingService {
  async gradeAttemptInTransaction(
    manager: EntityManager,
    attempt: ExamAttempt,
    gradedAt: Date = new Date(),
  ): Promise<ExamAttempt> {
    const snapshot = await manager.findOne(ExamAttemptSnapshot, {
      where: { attemptId: attempt.id },
    });

    if (
      !snapshot ||
      !Array.isArray(snapshot.shuffledQuestions) ||
      snapshot.shuffledQuestions.length === 0
    ) {
      throw new InternalServerErrorException({
        errorCode: 'ERR_SNAPSHOT_NOT_FOUND',
        message: 'Không tìm thấy dữ liệu Snapshot của bài thi để chấm điểm',
      });
    }

    const answers = await manager.find(ExamAttemptAnswer, {
      where: { attemptId: attempt.id },
    });

    // PMR 029: Không lọc status hay isDeleted khi nạp Exam phục vụ chấm điểm
    const exam = await manager.findOne(Exam, {
      where: { id: attempt.examId },
    });

    const answerKey = snapshot.answerKeySnapshot || {};
    const answerByQuestionId = new Map<string, ExamAttemptAnswer>();
    for (const ans of answers) {
      answerByQuestionId.set(ans.questionId, ans);
    }

    const questionIds = snapshot.shuffledQuestions
      .map((q) => String(q.id))
      .filter((id) => id.length > 0);

    const skillsByQuestionId = new Map<string, Skill[]>();
    if (questionIds.length > 0) {
      const questionsWithSkills = await manager.getRepository(Question).find({
        where: { id: In(questionIds) },
        relations: { skills: true },
        select: { id: true },
      });
      for (const q of questionsWithSkills) {
        if (Array.isArray(q.skills) && q.skills.length > 0) {
          skillsByQuestionId.set(q.id, q.skills);
        }
      }
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    let listeningTotal = 0;
    let listeningCorrect = 0;
    let readingTotal = 0;
    let readingCorrect = 0;

    const partMap = new Map<number, PartAccumulator>();
    const skillMap = new Map<string, SkillAccumulator>();

    for (const rawQuestion of snapshot.shuffledQuestions) {
      const questionId = String(rawQuestion.id);
      const partNumber = Number(rawQuestion.partNumber ?? 0);
      const correctOptionId = answerKey[questionId];
      const answer = answerByQuestionId.get(questionId);

      let outcome: 'correct' | 'wrong' | 'skipped';
      if (!answer || answer.selectedOptionId == null) {
        outcome = 'skipped';
        skippedCount++;
        if (answer) {
          // PMR 026: Câu chỉ gắn cờ review (selectedOptionId = null) vẫn cập nhật isCorrect = false
          answer.isCorrect = false;
        }
      } else if (correctOptionId != null && answer.selectedOptionId === correctOptionId) {
        outcome = 'correct';
        correctCount++;
        answer.isCorrect = true;
      } else {
        outcome = 'wrong';
        wrongCount++;
        answer.isCorrect = false;
      }

      if (partNumber >= 1 && partNumber <= 4) {
        listeningTotal++;
        if (outcome === 'correct') {
          listeningCorrect++;
        }
      } else if (partNumber >= 5 && partNumber <= 7) {
        readingTotal++;
        if (outcome === 'correct') {
          readingCorrect++;
        }
      }

      if (partNumber > 0) {
        let partAcc = partMap.get(partNumber);
        if (!partAcc) {
          partAcc = {
            partNumber,
            total: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            totalTimeSpentSeconds: 0,
          };
          partMap.set(partNumber, partAcc);
        }
        partAcc.total++;
        if (outcome === 'correct') partAcc.correct++;
        else if (outcome === 'wrong') partAcc.wrong++;
        else partAcc.skipped++;
        partAcc.totalTimeSpentSeconds += answer?.timeSpentSeconds ?? 0;
      }

      const questionSkills = skillsByQuestionId.get(questionId) || [];
      for (const skill of questionSkills) {
        let skillAcc = skillMap.get(skill.id);
        if (!skillAcc) {
          skillAcc = {
            skillId: skill.id,
            skillCode: skill.code,
            skillName: skill.name,
            total: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
          };
          skillMap.set(skill.id, skillAcc);
        }
        skillAcc.total++;
        if (outcome === 'correct') skillAcc.correct++;
        else if (outcome === 'wrong') skillAcc.wrong++;
        else skillAcc.skipped++;
      }
    }

    // PMR 026: Chỉ cập nhật is_correct cho các dòng đã tồn tại trong exam_attempt_answers
    if (answers.length > 0) {
      await manager.save(ExamAttemptAnswer, answers);
    }

    const totalQuestions = snapshot.shuffledQuestions.length;
    const accuracyPercentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;

    // PMR 029: Sắp xếp partBreakdown theo partNumber ASC và skillBreakdown theo skillCode ASC
    const partBreakdown: PartBreakdownItem[] = Array.from(partMap.values())
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((item) => ({
        partNumber: item.partNumber,
        total: item.total,
        correct: item.correct,
        wrong: item.wrong,
        skipped: item.skipped,
        accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 10000) / 100 : 0,
        avgTimeSeconds: item.total > 0 ? Math.round(item.totalTimeSpentSeconds / item.total) : 0,
      }));

    const skillBreakdown: SkillBreakdownItem[] = Array.from(skillMap.values())
      .sort((a, b) => a.skillCode.localeCompare(b.skillCode))
      .map((item) => ({
        skillId: item.skillId,
        skillCode: item.skillCode,
        skillName: item.skillName,
        total: item.total,
        correct: item.correct,
        wrong: item.wrong,
        skipped: item.skipped,
        accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 10000) / 100 : 0,
      }));

    let listeningScore: number | null = null;
    let readingScore: number | null = null;
    let totalScore: number | null = null;
    let isPassed: boolean | null = null;

    const scoreConversionType: ScoreConversionType =
      exam?.scoreConversionType ??
      (snapshot.examMetadata?.scoreConversionType as ScoreConversionType | undefined) ??
      ScoreConversionType.DEFAULT_ETS;

    const passingScore: number | null =
      exam?.passingScore ??
      (snapshot.examMetadata?.passingScore as number | null | undefined) ??
      null;

    if (attempt.mode === PartPracticeMode.FULL_EXAM) {
      if (scoreConversionType === ScoreConversionType.RAW_PERCENTAGE) {
        listeningScore = null;
        readingScore = null;
        totalScore = null;
        isPassed = passingScore !== null ? accuracyPercentage >= passingScore : null;
      } else {
        // DEFAULT_ETS hoặc CUSTOM (MVP fallback về DEFAULT_ETS — PMR 025 & PMR 026)
        listeningScore =
          listeningTotal > 0
            ? convertRawToEtsListening(Math.round((listeningCorrect / listeningTotal) * 100))
            : null;
        readingScore =
          readingTotal > 0
            ? convertRawToEtsReading(Math.round((readingCorrect / readingTotal) * 100))
            : null;
        totalScore =
          listeningScore !== null && readingScore !== null ? listeningScore + readingScore : null;
        isPassed = passingScore !== null && totalScore !== null ? totalScore >= passingScore : null;
      }
    }

    attempt.totalQuestions = totalQuestions;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.skippedCount = skippedCount;
    attempt.accuracyPercentage = accuracyPercentage;
    attempt.listeningScore = listeningScore;
    attempt.readingScore = readingScore;
    attempt.totalScore = totalScore;
    attempt.isPassed = isPassed;
    attempt.partBreakdown = partBreakdown;
    attempt.skillBreakdown = skillBreakdown;
    attempt.gradedAt = gradedAt;

    return manager.save(ExamAttempt, attempt);
  }
}
