import {
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
import { Question } from '../../questions/entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { Exam } from './exam.entity';
import { ExamSection } from './exam-section.entity';

@Entity({ name: 'exam_questions' })
@Unique('UQ_exam_questions_exam_question', ['examId', 'questionId'])
@Unique('uq_exam_question_order', ['examId', 'orderIndex'], { deferrable: 'INITIALLY DEFERRED' })
@Index('IDX_exam_questions_exam_id', ['examId'])
@Index('IDX_exam_questions_section_id', ['examSectionId'])
@Index('IDX_exam_questions_group_id', ['examId', 'questionGroupId'])
@Index('IDX_exam_questions_order', ['examId', 'orderIndex'])
export class ExamQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId!: string;

  @ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'exam_section_id', type: 'uuid' })
  examSectionId!: string;

  @ManyToOne(() => ExamSection, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_section_id' })
  section!: ExamSection;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'question_group_id', type: 'uuid', nullable: true })
  questionGroupId!: string | null;

  @ManyToOne(() => QuestionGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_group_id' })
  questionGroup!: QuestionGroup | null;

  @Column({ name: 'group_order', type: 'integer', nullable: true })
  groupOrder!: number | null;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
