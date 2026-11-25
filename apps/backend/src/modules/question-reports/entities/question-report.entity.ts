import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from '../../questions/entities/question.entity';
import { User } from '../../users/entities/user.entity';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity';
import { QuestionReportReason } from '../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../enums/question-report-status.enum';

@Entity('question_reports')
@Index('idx_question_reports_status_created', ['status', 'createdAt'])
@Index('idx_question_reports_question_status', ['questionId', 'status'])
@Index('idx_question_reports_reporter_created', ['reporterId', 'createdAt'])
@Index('uq_reporter_open_question_report', ['reporterId', 'questionId'], {
  unique: true,
  where: "status IN ('pending', 'in_review')",
})
export class QuestionReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_code', type: 'varchar', length: 20, unique: true, insert: false, update: false })
  reportCode!: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => Question, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @Column({ name: 'attempt_id', type: 'uuid', nullable: true })
  attemptId?: string | null = null;

  @ManyToOne(() => ExamAttempt, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'attempt_id' })
  attempt?: ExamAttempt | null;

  @Column({
    type: 'enum',
    enum: QuestionReportReason,
  })
  reason!: QuestionReportReason;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description?: string | null = null;

  @Column({
    type: 'enum',
    enum: QuestionReportStatus,
    default: QuestionReportStatus.PENDING,
  })
  status: QuestionReportStatus = QuestionReportStatus.PENDING;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedById?: string | null = null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy?: User | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null = null;

  @Column({
    name: 'resolution_note',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  resolutionNote?: string | null = null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
