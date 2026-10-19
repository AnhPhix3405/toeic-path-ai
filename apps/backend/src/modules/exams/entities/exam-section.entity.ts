import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ToeicPart } from '../../questions/entities/toeic-part.entity';
import { Exam } from './exam.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity({ name: 'exam_sections' })
@Index('IDX_exam_sections_exam_id', ['examId'])
@Unique('UQ_exam_sections_exam_part', ['examId', 'partId'])
export class ExamSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @ManyToOne(() => Exam, (exam) => exam.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'part_id', type: 'uuid' })
  partId!: string;

  @ManyToOne(() => ToeicPart, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'part_id' })
  part!: ToeicPart;

  @Column({ name: 'target_questions_count', type: 'integer' })
  targetQuestionsCount!: number;

  @Column({ name: 'target_duration_minutes', type: 'integer', nullable: true })
  targetDurationMinutes!: number | null;

  @OneToMany(() => ExamQuestion, (question) => question.section)
  questions!: ExamQuestion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
