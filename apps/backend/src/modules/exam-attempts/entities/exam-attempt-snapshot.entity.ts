import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('exam_attempt_snapshots')
export class ExamAttemptSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'attempt_id', type: 'uuid', unique: true })
  attemptId!: string;

  @OneToOne(() => ExamAttempt, (attempt) => attempt.snapshot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: ExamAttempt;

  @Column({ name: 'exam_metadata', type: 'jsonb' })
  examMetadata!: Record<string, any>;

  @Column({ name: 'shuffled_questions', type: 'jsonb' })
  shuffledQuestions!: Array<Record<string, any>>;

  @Column({ name: 'answer_key_snapshot', type: 'jsonb' })
  answerKeySnapshot!: Record<string, string>;

  @Column({ name: 'is_shuffled_questions', type: 'boolean', default: false })
  isShuffledQuestions: boolean = false;

  @Column({ name: 'is_shuffled_options', type: 'boolean', default: false })
  isShuffledOptions: boolean = false;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
