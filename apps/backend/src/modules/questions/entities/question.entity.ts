import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { QuestionOption } from './question-option.entity';
import { ToeicPart } from './toeic-part.entity';
import { Topic } from './topic.entity';
import { Skill } from './skill.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { MediaResource } from './media-resource.entity';
import { QuestionHistory } from './question-history.entity';
import { QuestionReview } from './question-review.entity';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'question_type', type: 'enum', enum: QuestionType })
  questionType!: QuestionType;

  @Column({ type: 'enum', enum: QuestionStatus, default: QuestionStatus.DRAFT })
  status!: QuestionStatus;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ name: 'question_group_id', type: 'uuid', nullable: true })
  questionGroupId!: string | null;

  @ManyToOne(() => QuestionGroup, (questionGroup) => questionGroup.questions, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'question_group_id' })
  questionGroup!: QuestionGroup | null;

  @Column({ name: 'group_order', type: 'integer', nullable: true })
  groupOrder!: number | null;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @OneToMany(() => QuestionOption, (option) => option.question)
  options!: QuestionOption[];

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId!: string | null;

  @ManyToOne(() => ToeicPart, (part) => part.questions, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'part_id' })
  part!: ToeicPart | null;

  @Column({ type: 'enum', enum: QuestionDifficulty, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @ManyToMany(() => Topic, (topic) => topic.questions)
  @JoinTable({
    name: 'question_topics',
    joinColumn: { name: 'question_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topic_id', referencedColumnName: 'id' },
  })
  topics!: Topic[];

  @ManyToMany(() => Skill, (skill) => skill.questions)
  @JoinTable({
    name: 'question_skills',
    joinColumn: { name: 'question_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills!: Skill[];

  @OneToMany(() => MediaResource, (media) => media.question)
  mediaResources!: MediaResource[];

  @OneToMany(() => QuestionHistory, (history) => history.question)
  histories!: QuestionHistory[];

  @OneToMany(() => QuestionReview, (review) => review.question)
  reviews!: QuestionReview[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
