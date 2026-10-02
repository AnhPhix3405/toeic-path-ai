import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';
import { Question } from './question.entity';

@Entity({ name: 'question_histories' })
@Index('IDX_question_histories_question_id', ['questionId', 'createdAt'])
@Index('IDX_question_histories_changed_by', ['changedBy'])
export class QuestionHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => Question, (question) => question.histories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by' })
  author!: User;

  @Column({
    name: 'change_type',
    type: 'enum',
    enum: QuestionHistoryChangeType,
  })
  changeType!: QuestionHistoryChangeType;

  @Column({ name: 'snapshot_before', type: 'jsonb', nullable: true })
  snapshotBefore!: Record<string, unknown> | null;

  @Column({ name: 'snapshot_after', type: 'jsonb' })
  snapshotAfter!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('IDX_question_histories_created_at')
  createdAt!: Date;
}
