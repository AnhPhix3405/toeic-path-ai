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
import { QuestionReviewAction } from '../enums/question-review-action.enum';
import { Question } from './question.entity';

@Entity({ name: 'question_reviews' })
@Index('IDX_question_reviews_qid_created', ['questionId', 'createdAt'])
@Index('IDX_question_reviews_reviewer_id', ['reviewerId'])
export class QuestionReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @ManyToOne(() => Question, (question) => question.reviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @Column({
    type: 'enum',
    enum: QuestionReviewAction,
  })
  action!: QuestionReviewAction;

  @Column({ type: 'text', nullable: true })
  feedback!: string | null;

  @Column({ type: 'integer' })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('IDX_question_reviews_created_at')
  createdAt!: Date;
}
