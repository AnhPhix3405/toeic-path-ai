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
import { User } from '../../users/entities/user.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { MediaResourceType } from '../enums/media-resource-type.enum';
import { Question } from './question.entity';

@Entity({ name: 'media_resources' })
@Index('IDX_media_resources_question_active', ['questionId', 'isDeleted'])
@Index('IDX_media_resources_group_active', ['questionGroupId', 'isDeleted'])
@Index('IDX_media_resources_cleanup', ['isDeleted', 'deletedAt'])
export class MediaResource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'resource_type', type: 'enum', enum: MediaResourceType })
  resourceType!: MediaResourceType;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId!: string | null;

  @ManyToOne(() => Question, (question) => question.mediaResources, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'question_id' })
  question!: Question | null;

  @Column({ name: 'question_group_id', type: 'uuid', nullable: true })
  questionGroupId!: string | null;

  @ManyToOne(() => QuestionGroup, (group) => group.mediaResources, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'question_group_id' })
  questionGroup!: QuestionGroup | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('IDX_media_resources_created_at')
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
