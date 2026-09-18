import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity({ name: 'question_options' })
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => Question, (question) => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'varchar', length: 10 })
  label!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
