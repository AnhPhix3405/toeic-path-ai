import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('exam_attempt_answers')
@Unique('uq_attempt_question_answer', ['attemptId', 'questionId'])
@Check('chk_answer_time_spent_non_negative', 'time_spent_seconds >= 0')
@Index('idx_attempt_answers_attempt', ['attemptId'])
export class ExamAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId!: string;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: ExamAttempt;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @Column({ name: 'selected_option_id', type: 'uuid', nullable: true })
  selectedOptionId?: string | null;

  @Column({ name: 'is_marked_for_review', type: 'boolean', default: false })
  isMarkedForReview: boolean = false;

  @Column({ name: 'time_spent_seconds', type: 'int', default: 0 })
  timeSpentSeconds: number = 0;

  @Column({ name: 'answered_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  answeredAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
