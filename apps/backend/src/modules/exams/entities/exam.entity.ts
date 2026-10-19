import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';
import { ExamSection } from './exam-section.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity({ name: 'exams' })
@Index('IDX_exams_catalog_active', ['status', 'isDeleted', 'openAt', 'closeAt'])
@Index('IDX_exams_manage_creator', ['createdBy', 'status', 'isDeleted'])
@Index('IDX_exams_created_at', ['createdAt'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ExamType })
  type!: ExamType;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Column({ name: 'max_attempts', type: 'integer', nullable: true })
  maxAttempts!: number | null;

  @Column({ name: 'passing_score', type: 'integer', nullable: true })
  passingScore!: number | null;

  @Column({ name: 'open_at', type: 'timestamptz', nullable: true })
  openAt!: Date | null;

  @Column({ name: 'close_at', type: 'timestamptz', nullable: true })
  closeAt!: Date | null;

  @Column({ name: 'allow_part_practice', type: 'boolean', default: true })
  allowPartPractice!: boolean;

  @Column({ name: 'is_shuffled_questions', type: 'boolean', default: false })
  isShuffledQuestions!: boolean;

  @Column({ name: 'is_shuffled_options', type: 'boolean', default: false })
  isShuffledOptions!: boolean;

  @Column({
    name: 'score_conversion_type',
    type: 'enum',
    enum: ScoreConversionType,
    default: ScoreConversionType.DEFAULT_ETS,
  })
  scoreConversionType!: ScoreConversionType;

  @Column({ type: 'enum', enum: ExamStatus, default: ExamStatus.DRAFT })
  status!: ExamStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => ExamSection, (section) => section.exam)
  sections!: ExamSection[];

  @OneToMany(() => ExamQuestion, (question) => question.exam)
  questions!: ExamQuestion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
