import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Gender } from '../../../common/enums/gender.enum';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'avatar_storage_key', type: 'varchar', length: 500, nullable: true })
  avatarStorageKey!: string | null;

  @Column({ name: 'avatar_mime_type', type: 'varchar', length: 100, nullable: true })
  avatarMimeType!: string | null;

  @Column({ name: 'avatar_size_bytes', type: 'integer', nullable: true })
  avatarSizeBytes!: number | null;

  @Column({ type: 'date', nullable: true })
  birthday!: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'user_profiles_gender_enum', nullable: true })
  gender!: Gender | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
