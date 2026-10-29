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

@Entity('exam_attempts')
@Check('chk_attempt_expires_after_started', 'expires_at > started_at')
@Check('chk_attempt_total_questions_positive', 'total_questions > 0')
@Check('chk_attempt_answered_count_non_negative', 'answered_count >= 0')
@Index('idx_attempts_user_exam_status', ['userId', 'examId', 'status'])
@Index('idx_attempts_user_status', ['userId', 'status'])
@Index('idx_attempts_status_expires', ['status', 'expiresAt'])
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
