import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptSnapshot } from './exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import { PartBreakdownItem, SkillBreakdownItem } from '../interfaces/attempt-breakdown.interface';

export const numericPercentageTransformer = {
  to: (value?: number | null): number | null =>
    value === undefined || value === null ? null : value,
  from: (value?: string | number | null): number | null =>
    value === undefined || value === null ? null : Number(value),
};

@Entity('exam_attempts')
@Check('chk_attempt_expires_after_started', 'expires_at > started_at')
@Check('chk_attempt_total_questions_positive', 'total_questions > 0')
@Check('chk_attempt_answered_count_non_negative', 'answered_count >= 0')
@Check(
  'chk_attempt_duration_spent_non_negative',
  'duration_spent_seconds IS NULL OR duration_spent_seconds >= 0',
)
@Check(
  'chk_attempt_scores_range',
  '(listening_score IS NULL OR (listening_score >= 5 AND listening_score <= 495)) AND (reading_score IS NULL OR (reading_score >= 5 AND reading_score <= 495)) AND (total_score IS NULL OR (total_score >= 10 AND total_score <= 990))',
)
@Check(
  'chk_attempt_counts_non_negative',
  '(correct_count IS NULL OR correct_count >= 0) AND (wrong_count IS NULL OR wrong_count >= 0) AND (skipped_count IS NULL OR skipped_count >= 0)',
)
@Check(
  'chk_attempt_accuracy_range',
  'accuracy_percentage IS NULL OR (accuracy_percentage >= 0 AND accuracy_percentage <= 100)',
)
@Index('idx_attempts_user_exam_status', ['userId', 'examId', 'status'])
@Index('idx_attempts_user_status', ['userId', 'status'])
@Index('idx_attempts_status_expires', ['status', 'expiresAt'])
@Index('idx_attempts_user_started_at', ['userId', 'startedAt'])
@Index('uq_user_single_active_attempt', ['userId'], {
  unique: true,
  where: "status = 'in_progress'",
})
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @ManyToOne(() => Exam, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({
    type: 'enum',
    enum: ExamAttemptStatus,
    default: ExamAttemptStatus.IN_PROGRESS,
  })
  status: ExamAttemptStatus = ExamAttemptStatus.IN_PROGRESS;

  @Column({
    type: 'enum',
    enum: PartPracticeMode,
    default: PartPracticeMode.FULL_EXAM,
  })
  mode: PartPracticeMode = PartPracticeMode.FULL_EXAM;

  @Column({ name: 'selected_parts', type: 'jsonb', nullable: true })
  selectedParts?: number[] | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions!: number;

  @Column({ name: 'answered_count', type: 'int', default: 0 })
  answeredCount: number = 0;

  @Column({ name: 'device_info', type: 'varchar', length: 500, nullable: true })
  deviceInfo?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'duration_spent_seconds', type: 'int', nullable: true })
  durationSpentSeconds?: number | null = null;

  @Column({ name: 'total_score', type: 'int', nullable: true })
  totalScore?: number | null = null;

  @Column({ name: 'listening_score', type: 'int', nullable: true })
  listeningScore?: number | null = null;

  @Column({ name: 'reading_score', type: 'int', nullable: true })
  readingScore?: number | null = null;

  @Column({ name: 'correct_count', type: 'int', nullable: true })
  correctCount?: number | null = null;

  @Column({ name: 'wrong_count', type: 'int', nullable: true })
  wrongCount?: number | null = null;

  @Column({ name: 'skipped_count', type: 'int', nullable: true })
  skippedCount?: number | null = null;

  @Column({
    name: 'accuracy_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericPercentageTransformer,
  })
  accuracyPercentage?: number | null = null;

  @Column({ name: 'is_passed', type: 'boolean', nullable: true })
  isPassed?: boolean | null = null;

  @Column({ name: 'part_breakdown', type: 'jsonb', nullable: true })
  partBreakdown?: PartBreakdownItem[] | null = null;

  @Column({ name: 'skill_breakdown', type: 'jsonb', nullable: true })
  skillBreakdown?: SkillBreakdownItem[] | null = null;

  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt?: Date | null = null;

  @VersionColumn({ default: 1 })
  version: number = 1;

  @OneToOne(() => ExamAttemptSnapshot, (snapshot) => snapshot.attempt, {
    cascade: true,
    lazy: true,
  })
  snapshot?: Promise<ExamAttemptSnapshot> | ExamAttemptSnapshot;

  @OneToMany(() => ExamAttemptAnswer, (answer) => answer.attempt)
  answers?: ExamAttemptAnswer[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
