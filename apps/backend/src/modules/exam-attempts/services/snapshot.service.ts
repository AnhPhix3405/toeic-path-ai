import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { ExamQuestion } from '../../exams/entities/exam-question.entity';

export interface SnapshotResult {
  examMetadata: Record<string, any>;
  shuffledQuestions: Array<Record<string, any>>;
  answerKeySnapshot: Record<string, string>;
  isShuffledQuestions: boolean;
  isShuffledOptions: boolean;
  totalQuestions: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

@Injectable()
export class SnapshotService {
  constructor(private readonly dataSource: DataSource) {}

  async createSnapshot(exam: Exam, selectedParts?: number[]): Promise<SnapshotResult> {
    const query = this.dataSource
      .getRepository(ExamQuestion)
      .createQueryBuilder('eq')
      .leftJoinAndSelect('eq.section', 'section')
      .leftJoinAndSelect('section.part', 'part')
      .leftJoinAndSelect('eq.question', 'question')
      .leftJoinAndSelect('question.options', 'options')
      .leftJoinAndSelect('question.questionGroup', 'group')
      .where('eq.examId = :examId', { examId: exam.id });

    if (selectedParts && selectedParts.length > 0) {
      query.andWhere('part.partNumber IN (:...selectedParts)', { selectedParts });
    }

    query.orderBy('eq.orderIndex', 'ASC').addOrderBy('options.position', 'ASC');

    const examQuestions = await query.getMany();

    // 1. Group into blocks: single question vs question groups (to preserve QuestionGroup Integrity)
    type QuestionItem = {
      eq: ExamQuestion;
      originalQuestionNumber: number;
    };

    type QuestionBlock = {
      groupId: string | null;
      items: QuestionItem[];
    };

    const blocks: QuestionBlock[] = [];
    const groupMap = new Map<string, QuestionBlock>();

    for (const eq of examQuestions) {
      const item: QuestionItem = {
        eq,
        originalQuestionNumber: eq.orderIndex,
      };

      if (eq.questionGroupId) {
        if (!groupMap.has(eq.questionGroupId)) {
          const newBlock: QuestionBlock = {
            groupId: eq.questionGroupId,
            items: [],
          };
          groupMap.set(eq.questionGroupId, newBlock);
          blocks.push(newBlock);
        }
        groupMap.get(eq.questionGroupId)!.items.push(item);
      } else {
        blocks.push({
          groupId: null,
          items: [item],
        });
      }
    }

    // 2. Sort items within groups by groupOrder or orderIndex
    for (const block of blocks) {
      if (block.groupId) {
        block.items.sort((a, b) => (a.eq.groupOrder ?? 0) - (b.eq.groupOrder ?? 0));
      }
    }

    // 3. Shuffle blocks if exam.isShuffledQuestions = true (Fisher-Yates)
    if (exam.isShuffledQuestions) {
      this.shuffleArray(blocks);
    }

    // 4. Flatten back to array and assign continuous orderIndex 1..N
    const answerKeySnapshot: Record<string, string> = {};
    const shuffledQuestions: Array<Record<string, any>> = [];

    let currentOrderIndex = 1;

    for (const block of blocks) {
      for (const item of block.items) {
        const question = item.eq.question;
        const options = [...(question.options || [])];

        // Find correct option before shuffling options to record answerKeySnapshot
        const correctOpt = options.find((opt) => opt.isCorrect);
        if (correctOpt) {
          answerKeySnapshot[question.id] = correctOpt.id;
        }

        // Shuffle options if exam.isShuffledOptions = true
        if (exam.isShuffledOptions) {
          this.shuffleArray(options);
        }

        // PMR 021: Re-label options A, B, C, D and position 1..4 in visual display order
        const sanitizedOptions = options.map((opt, optIndex) => ({
          id: opt.id,
          label: OPTION_LABELS[optIndex] || String.fromCharCode(65 + optIndex),
          content: opt.content ?? null,
          position: optIndex + 1,
        }));

        shuffledQuestions.push({
          id: question.id,
          partNumber: item.eq.section?.part?.partNumber ?? null,
          orderIndex: currentOrderIndex++,
          originalQuestionNumber: item.originalQuestionNumber,
          questionGroupId: item.eq.questionGroupId ?? null,
          groupOrder: item.eq.groupOrder ?? null,
          content: question.content ?? null,
          audioUrl: (question as unknown as { audioUrl?: string | null }).audioUrl ?? null,
          imageUrl: (question as unknown as { imageUrl?: string | null }).imageUrl ?? null,
          questionType: question.questionType,
          questionGroup: question.questionGroup
            ? {
                id: question.questionGroup.id,
                title: question.questionGroup.title ?? null,
                context: question.questionGroup.context,
              }
            : null,
          options: sanitizedOptions,
        });
      }
    }

    return {
      examMetadata: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        type: exam.type,
        durationMinutes: exam.durationMinutes,
        scoreConversionType: exam.scoreConversionType,
        selectedParts: selectedParts ?? null,
        capturedAt: new Date(),
      },
      shuffledQuestions,
      answerKeySnapshot,
      isShuffledQuestions: exam.isShuffledQuestions,
      isShuffledOptions: exam.isShuffledOptions,
      totalQuestions: shuffledQuestions.length,
    };
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
