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
import { ImportJobStatus } from '../enums/import-job-status.enum';
import { QuestionStatus } from '../enums/question-status.enum';

@Entity({ name: 'import_jobs' })
@Index('IDX_import_jobs_created_by', ['createdBy'])
@Index('IDX_import_jobs_status', ['status'])
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'file_type', type: 'varchar', length: 50 })
  fileType!: string;

  @Column({
    type: 'enum',
    enum: ImportJobStatus,
    default: ImportJobStatus.PENDING,
  })
  status!: ImportJobStatus;

  @Column({
    name: 'target_status',
    type: 'enum',
    enum: QuestionStatus,
    default: QuestionStatus.DRAFT,
  })
  targetStatus!: QuestionStatus;

  @Column({ name: 'total_rows', type: 'integer', default: 0 })
  totalRows!: number;

  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount!: number;

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount!: number;

  @Column({ name: 'created_groups_count', type: 'integer', default: 0 })
  createdGroupsCount!: number;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails!: Array<{ row: number; error: string; code?: string }> | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('IDX_import_jobs_created_at')
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
