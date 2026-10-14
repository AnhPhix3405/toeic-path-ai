import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { IMPORT_LIMITS } from '../../../config/import.config';
import { STORAGE_SERVICE } from '../../storage/storage.constants';
import type { StorageService } from '../../storage/interfaces/storage-service.interface';
import { ImportJob } from '../entities/import-job.entity';
import { Question } from '../entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { QuestionOption } from '../entities/question-option.entity';
import { MediaResource } from '../entities/media-resource.entity';
import { ToeicPart } from '../entities/toeic-part.entity';
import { Topic } from '../entities/topic.entity';
import { Skill } from '../entities/skill.entity';
import { ImportJobStatus } from '../enums/import-job-status.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { MediaResourceType } from '../enums/media-resource-type.enum';
import { ExcelParserService, ParsedQuestionRow } from './excel-parser.service';
import { ZipExtractorService } from './zip-extractor.service';
import { QueryImportJobsDto } from '../dto/request/query-import-jobs.dto';
import {
  SkippedReviewItemDto,
  SubmitForReviewResponseDto,
} from '../dto/response/submit-for-review-response.dto';

export const ALLOWED_MEDIA_MODIFY_STATUSES = [
  QuestionStatus.DRAFT,
  QuestionStatus.REVISION_REQUESTED,
];

export interface ImportProcessingResult {
  jobId: string;
  isAsync: boolean;
  status: ImportJobStatus;
  totalRows: number;
  successCount?: number;
  errorCount?: number;
  createdGroupsCount?: number;
  errorDetails?: Array<{ row: number; error: string; code?: string }> | null;
  message?: string;
}

@Injectable()
export class QuestionsImportService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionGroup)
    private readonly questionGroupRepo: Repository<QuestionGroup>,
    @InjectRepository(QuestionOption)
    private readonly optionRepo: Repository<QuestionOption>,
    @InjectRepository(MediaResource)
    private readonly mediaRepo: Repository<MediaResource>,
    @InjectRepository(ToeicPart)
    private readonly partRepo: Repository<ToeicPart>,
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    private readonly excelParserService: ExcelParserService,
    private readonly zipExtractorService: ZipExtractorService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectQueue(IMPORT_LIMITS.QUEUE_NAME)
    private readonly importQueue: Queue,
  ) {}

  async processUploadedFile(
    file: Express.Multer.File,
    targetStatus: QuestionStatus = QuestionStatus.DRAFT,
    userId: string,
  ): Promise<ImportProcessingResult> {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên tệp tin hợp lệ.');
    }

    const lowerExt = path.extname(file.originalname).toLowerCase();
    const isZip = lowerExt === '.zip';
    const isExcel = lowerExt === '.xlsx' || lowerExt === '.xls';

    if (!isZip && !isExcel) {
      throw new BadRequestException(
        'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận tệp .xlsx hoặc .zip.',
      );
    }

    if (isExcel && file.size > IMPORT_LIMITS.MAX_EXCEL_SIZE_BYTES) {
      throw new BadRequestException('Kích thước tệp Excel vượt quá giới hạn tối đa 10MB.');
    }

    if (isZip && file.size > IMPORT_LIMITS.MAX_ZIP_SIZE_BYTES) {
      throw new BadRequestException('Kích thước gói ZIP vượt quá giới hạn tối đa 50MB.');
    }

    let excelBuffer: Buffer;
    let mediaFiles = new Map<string, { buffer: Buffer; mimeType: string; size: number }>();

    if (isZip) {
      const extracted = await this.zipExtractorService.extractZipPackage(file.buffer);
      excelBuffer = extracted.excelBuffer;
      mediaFiles = extracted.mediaFiles;
    } else {
      excelBuffer = file.buffer;
    }

    const totalRows = await this.excelParserService.countTotalDataRows(excelBuffer);
    if (totalRows === 0) {
      throw new BadRequestException('Tệp Excel không chứa dòng dữ liệu nào.');
    }

    // 1. Upload original file to Cloud Storage
    const generatedStorageKey = `import-files/${userId}/${randomUUID()}_${file.originalname}`;
    let storageKey = generatedStorageKey;
    let fileUrl: string | null = null;
    if (this.storageService.uploadFile) {
      try {
        const stored = await this.storageService.uploadFile({
          buffer: file.buffer,
          storageKey: generatedStorageKey,
          mimeType: file.mimetype,
          bucket: 'media',
        });
        fileUrl = stored.url;
        if (stored.storageKey) {
          storageKey = stored.storageKey;
        }
      } catch {
        fileUrl = null;
      }
    }

    // 2. Create ImportJob record in DB
    const job = this.importJobRepo.create({
      fileName: file.originalname,
      fileUrl,
      fileType: isZip ? 'zip' : 'excel',
      status: ImportJobStatus.PENDING,
      targetStatus,
      totalRows,
      createdBy: userId,
    });
    const savedJob = await this.importJobRepo.save(job);

    // 3. Threshold Routing: Sync (< 100 rows) vs Async BullMQ (>= 100 rows)
    if (totalRows < IMPORT_LIMITS.ASYNC_ROW_THRESHOLD) {
      return this.processImportSync(savedJob.id, {
        excelBuffer,
        mediaFilesMap: mediaFiles,
        targetStatus,
        userId,
      });
    }

    // Async BullMQ Queue (NO binary buffers in Redis)
    savedJob.status = ImportJobStatus.PROCESSING;
    await this.importJobRepo.save(savedJob);

    await this.importQueue.add(IMPORT_LIMITS.JOB_NAME, {
      jobId: savedJob.id,
      storageKey,
      fileType: isZip ? 'zip' : 'excel',
      targetStatus,
      userId,
    });

    return {
      jobId: savedJob.id,
      isAsync: true,
      status: ImportJobStatus.PROCESSING,
      totalRows,
      message: 'Tệp lớn đã được tiếp nhận và đang được xử lý bất đồng bộ qua hàng đợi.',
    };
  }

  async processImportSync(
    jobId: string,
    options: {
      excelBuffer: Buffer;
      mediaFilesMap: Map<string, { buffer: Buffer; mimeType: string; size: number }>;
      targetStatus: QuestionStatus;
      userId: string;
    },
  ): Promise<ImportProcessingResult> {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Không tìm thấy import job.');
    }

    const {
      standaloneQuestions,
      groupedQuestions,
      totalRows,
      errors: parseErrors,
    } = await this.excelParserService.parseQuestionsExcel(options.excelBuffer);

    // Cache Parts, Topics, Skills
    const parts = await this.partRepo.find();
    const partMap = new Map<number, ToeicPart>();
    parts.forEach((p) => partMap.set(p.partNumber, p));

    const topics = await this.topicRepo.find();
    const topicMap = new Map<string, Topic>();
    topics.forEach((t) => topicMap.set(t.code.toUpperCase(), t));

    const skills = await this.skillRepo.find();
    const skillMap = new Map<string, Skill>();
    skills.forEach((s) => skillMap.set(s.code.toUpperCase(), s));

    let successCount = 0;
    let errorCount = parseErrors.length;
    let createdGroupsCount = 0;
    const allErrors: Array<{ row: number; error: string; code?: string }> = [
      ...parseErrors.map((e) => ({ row: e.row, error: e.error, code: e.code })),
    ];

    const parsedErrorRows = new Set(parseErrors.map((e) => e.row));

    // A. Process Standalone Questions (Transaction per row)
    for (const q of standaloneQuestions) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const part = partMap.get(q.partNumber);
        if (!part) {
          throw new BadRequestException({
            message: `Không tìm thấy thông tin Part ${q.partNumber} trong hệ thống.`,
            code: 'PART_NOT_FOUND',
          });
        }

        // Whitelist status check on Media Replacement
        if (q.mediaRef) {
          const mediaTarget = await this.findMediaReplacementTarget(
            q.mediaRef,
            q,
            queryRunner.manager,
          );
          if (mediaTarget && !ALLOWED_MEDIA_MODIFY_STATUSES.includes(mediaTarget.status)) {
            const err = new BadRequestException({
              message: 'Không thể thay thế media cho câu hỏi đã xuất bản hoặc đang chờ duyệt.',
              code: 'CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT',
            });
            throw err;
          }
        }

        // Create Question
        const questionTopics: Topic[] = [];
        if (q.topicCode && topicMap.has(q.topicCode.toUpperCase())) {
          questionTopics.push(topicMap.get(q.topicCode.toUpperCase())!);
        }

        const questionSkills: Skill[] = [];
        if (q.skillCode && skillMap.has(q.skillCode.toUpperCase())) {
          questionSkills.push(skillMap.get(q.skillCode.toUpperCase())!);
        }

        const question = queryRunner.manager.create(Question, {
          content: q.questionText ? q.questionText : null,
          questionType: QuestionType.SINGLE_CHOICE,
          status: options.targetStatus,
          explanation: q.explanation ?? null,
          partId: part.id,
          difficulty: q.difficulty
            ? (q.difficulty as QuestionDifficulty)
            : QuestionDifficulty.MEDIUM,
          createdBy: options.userId,
          topics: questionTopics,
          skills: questionSkills,
        });
        const savedQuestion = await queryRunner.manager.save(Question, question);

        // Create Options
        let optionsData: Array<{ label: string; content: string | null; pos: number }> = [];
        if (q.partNumber === 1) {
          optionsData = [
            { label: 'A', content: q.optionA || null, pos: 1 },
            { label: 'B', content: q.optionB || null, pos: 2 },
            { label: 'C', content: q.optionC || null, pos: 3 },
            { label: 'D', content: q.optionD || null, pos: 4 },
          ];
        } else if (q.partNumber === 2) {
          optionsData = [
            { label: 'A', content: q.optionA || null, pos: 1 },
            { label: 'B', content: q.optionB || null, pos: 2 },
            { label: 'C', content: q.optionC || null, pos: 3 },
          ];
        } else {
          optionsData = [
            { label: 'A', content: q.optionA || null, pos: 1 },
            { label: 'B', content: q.optionB || null, pos: 2 },
            { label: 'C', content: q.optionC || null, pos: 3 },
            ...(q.optionD ? [{ label: 'D', content: q.optionD, pos: 4 }] : []),
          ];
        }

        for (const opt of optionsData) {
          const optEntity = queryRunner.manager.create(QuestionOption, {
            questionId: savedQuestion.id,
            label: opt.label,
            content: opt.content,
            isCorrect: q.correctAnswer === opt.label,
            position: opt.pos,
          });
          await queryRunner.manager.save(QuestionOption, optEntity);
        }

        // Save Media if referenced
        if (q.mediaRef && options.mediaFilesMap.has(q.mediaRef)) {
          const mediaFile = options.mediaFilesMap.get(q.mediaRef)!;
          await this.saveMediaResource(
            q.mediaRef,
            mediaFile,
            { questionId: savedQuestion.id },
            options.userId,
            queryRunner.manager,
          );
        }

        await queryRunner.commitTransaction();
        successCount++;
      } catch (err: unknown) {
        await queryRunner.rollbackTransaction();
        errorCount++;
        const { message, code } = this.extractErrorMessage(err);
        allErrors.push({
          row: q.rowNumber,
          error: message,
          code,
        });
      } finally {
        await queryRunner.release();
      }
    }

    // B. Process Grouped Questions (Transaction atomic per group)
    for (const [groupId, groupQuestions] of groupedQuestions.entries()) {
      // If any row in group had parse errors, group is rejected
      const groupHasParseError =
        parseErrors.some((e) => e.groupId === groupId) ||
        groupQuestions.some((q) => parsedErrorRows.has(q.rowNumber));

      if (groupHasParseError) {
        errorCount += groupQuestions.length;
        for (const q of groupQuestions) {
          allErrors.push({
            row: q.rowNumber,
            error: 'Câu hỏi trong nhóm bị hủy bỏ do nhóm có câu hỏi con bị lỗi (Group Atomicity).',
            code: 'GROUP_ROLLBACK',
          });
        }
        continue;
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Validate all rows in group first
        for (const q of groupQuestions) {
          const part = partMap.get(q.partNumber);
          if (!part) {
            throw new BadRequestException({
              message: `Không tìm thấy thông tin Part ${q.partNumber} trong hệ thống.`,
              code: 'PART_NOT_FOUND',
            });
          }

          if (q.mediaRef) {
            const mediaTarget = await this.findMediaReplacementTarget(
              q.mediaRef,
              q,
              queryRunner.manager,
            );
            if (mediaTarget && !ALLOWED_MEDIA_MODIFY_STATUSES.includes(mediaTarget.status)) {
              throw new BadRequestException({
                message: 'Không thể thay thế media cho câu hỏi đã xuất bản hoặc đang chờ duyệt.',
                code: 'CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT',
              });
            }
          }
        }

        // Create QuestionGroup
        const firstRow = groupQuestions[0];
        const groupContext =
          firstRow.passageText ||
          groupQuestions.find((g) => g.passageText)?.passageText ||
          `Group ${groupId}`;

        const questionGroup = queryRunner.manager.create(QuestionGroup, {
          title: groupId,
          context: groupContext,
          createdBy: options.userId,
        });
        const savedGroup = await queryRunner.manager.save(QuestionGroup, questionGroup);

        // Group-level media (if first row or any row references media for passage)
        if (firstRow.mediaRef && options.mediaFilesMap.has(firstRow.mediaRef)) {
          const mediaFile = options.mediaFilesMap.get(firstRow.mediaRef)!;
          await this.saveMediaResource(
            firstRow.mediaRef,
            mediaFile,
            { questionGroupId: savedGroup.id },
            options.userId,
            queryRunner.manager,
          );
        }

        // Create Child Questions
        for (let idx = 0; idx < groupQuestions.length; idx++) {
          const q = groupQuestions[idx];
          const part = partMap.get(q.partNumber)!;

          const questionTopics: Topic[] = [];
          if (q.topicCode && topicMap.has(q.topicCode.toUpperCase())) {
            questionTopics.push(topicMap.get(q.topicCode.toUpperCase())!);
          }

          const questionSkills: Skill[] = [];
          if (q.skillCode && skillMap.has(q.skillCode.toUpperCase())) {
            questionSkills.push(skillMap.get(q.skillCode.toUpperCase())!);
          }

          const childQuestion = queryRunner.manager.create(Question, {
            content: q.questionText ? q.questionText : null,
            questionType: QuestionType.SINGLE_CHOICE,
            status: options.targetStatus,
            explanation: q.explanation ?? null,
            partId: part.id,
            questionGroupId: savedGroup.id,
            groupOrder: idx + 1,
            difficulty: q.difficulty
              ? (q.difficulty as QuestionDifficulty)
              : QuestionDifficulty.MEDIUM,
            createdBy: options.userId,
            topics: questionTopics,
            skills: questionSkills,
          });
          const savedChild = await queryRunner.manager.save(Question, childQuestion);

          // Options
          let optionsData: Array<{ label: string; content: string | null; pos: number }> = [];
          if (q.partNumber === 1) {
            optionsData = [
              { label: 'A', content: q.optionA || null, pos: 1 },
              { label: 'B', content: q.optionB || null, pos: 2 },
              { label: 'C', content: q.optionC || null, pos: 3 },
              { label: 'D', content: q.optionD || null, pos: 4 },
            ];
          } else if (q.partNumber === 2) {
            optionsData = [
              { label: 'A', content: q.optionA || null, pos: 1 },
              { label: 'B', content: q.optionB || null, pos: 2 },
              { label: 'C', content: q.optionC || null, pos: 3 },
            ];
          } else {
            optionsData = [
              { label: 'A', content: q.optionA || null, pos: 1 },
              { label: 'B', content: q.optionB || null, pos: 2 },
              { label: 'C', content: q.optionC || null, pos: 3 },
              ...(q.optionD ? [{ label: 'D', content: q.optionD, pos: 4 }] : []),
            ];
          }

          for (const opt of optionsData) {
            const optEntity = queryRunner.manager.create(QuestionOption, {
              questionId: savedChild.id,
              label: opt.label,
              content: opt.content,
              isCorrect: q.correctAnswer === opt.label,
              position: opt.pos,
            });
            await queryRunner.manager.save(QuestionOption, optEntity);
          }

          // Individual question media (if distinct from group media)
          if (
            q.mediaRef &&
            q.mediaRef !== firstRow.mediaRef &&
            options.mediaFilesMap.has(q.mediaRef)
          ) {
            const mediaFile = options.mediaFilesMap.get(q.mediaRef)!;
            await this.saveMediaResource(
              q.mediaRef,
              mediaFile,
              { questionId: savedChild.id },
              options.userId,
              queryRunner.manager,
            );
          }
        }

        await queryRunner.commitTransaction();
        createdGroupsCount++;
        successCount += groupQuestions.length;
      } catch (err: unknown) {
        await queryRunner.rollbackTransaction();
        errorCount += groupQuestions.length;
        const { message, code } = this.extractErrorMessage(err);

        for (const q of groupQuestions) {
          allErrors.push({
            row: q.rowNumber,
            error: message,
            code,
          });
        }
      } finally {
        await queryRunner.release();
      }
    }

    // C. Update ImportJob
    job.totalRows = totalRows;
    job.successCount = successCount;
    job.errorCount = errorCount;
    job.createdGroupsCount = createdGroupsCount;
    job.errorDetails = allErrors.length > 0 ? allErrors : null;
    job.completedAt = new Date();

    if (errorCount === 0) {
      job.status = ImportJobStatus.COMPLETED;
    } else if (successCount > 0) {
      job.status = ImportJobStatus.PARTIALLY_COMPLETED;
    } else {
      job.status = ImportJobStatus.FAILED;
    }

    await this.importJobRepo.save(job);

    return {
      jobId: job.id,
      isAsync: false,
      status: job.status,
      totalRows: job.totalRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      createdGroupsCount: job.createdGroupsCount,
      errorDetails: job.errorDetails,
    };
  }

  async processImportAsync(
    jobId: string,
    storageKey: string,
    fileType: 'excel' | 'zip',
    targetStatus: QuestionStatus,
    userId: string,
  ): Promise<void> {
    if (!this.storageService.downloadFile) {
      throw new Error('Storage service does not support downloadFile.');
    }

    const fileBuffer = await this.storageService.downloadFile(storageKey, 'media');

    let excelBuffer: Buffer;
    let mediaFiles = new Map<string, { buffer: Buffer; mimeType: string; size: number }>();

    if (fileType === 'zip') {
      const extracted = await this.zipExtractorService.extractZipPackage(fileBuffer);
      excelBuffer = extracted.excelBuffer;
      mediaFiles = extracted.mediaFiles;
    } else {
      excelBuffer = fileBuffer;
    }

    await this.processImportSync(jobId, {
      excelBuffer,
      mediaFilesMap: mediaFiles,
      targetStatus,
      userId,
    });
  }

  protected async findMediaReplacementTarget(
    mediaRef: string,
    row: ParsedQuestionRow,
    manager: EntityManager,
  ): Promise<{
    targetType: 'question' | 'group';
    targetId: string;
    status: QuestionStatus;
  } | null> {
    if (row.questionText) {
      const existing = await manager.findOne(Question, {
        where: { content: row.questionText },
        select: { id: true, status: true },
      });
      if (existing) {
        return {
          targetType: 'question',
          targetId: existing.id,
          status: existing.status,
        };
      }
    }
    return null;
  }

  private extractErrorMessage(err: unknown): { message: string; code: string } {
    if (err instanceof BadRequestException) {
      const resp = err.getResponse();
      if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        return {
          message: typeof r.message === 'string' ? r.message : err.message,
          code: typeof r.code === 'string' ? r.code : 'ROW_PROCESSING_ERROR',
        };
      }
      return { message: err.message, code: 'ROW_PROCESSING_ERROR' };
    }
    if (err instanceof Error) {
      return { message: err.message, code: 'ROW_PROCESSING_ERROR' };
    }
    return { message: 'Lỗi khi xử lý dòng.', code: 'ROW_PROCESSING_ERROR' };
  }

  private async saveMediaResource(
    mediaRef: string,
    file: { buffer: Buffer; mimeType: string; size: number },
    target: { questionId?: string; questionGroupId?: string },
    userId: string,
    manager: EntityManager,
  ): Promise<MediaResource> {
    const resourceType = file.mimeType.startsWith('audio/')
      ? MediaResourceType.AUDIO
      : MediaResourceType.IMAGE;

    const storageKey = `questions/${resourceType}/${userId}/${randomUUID()}_${path.basename(mediaRef)}`;
    let fileUrl = `https://storage.local/${storageKey}`;

    if (this.storageService.uploadFile) {
      const stored = await this.storageService.uploadFile({
        buffer: file.buffer,
        storageKey,
        mimeType: file.mimeType,
        bucket: 'media',
      });
      fileUrl = stored.url;
    }

    const media = manager.create(MediaResource, {
      fileName: path.basename(mediaRef),
      fileUrl,
      resourceType,
      mimeType: file.mimeType,
      fileSize: file.size,
      questionId: target.questionId ?? null,
      questionGroupId: target.questionGroupId ?? null,
      isDeleted: false,
      deletedAt: null,
      createdBy: userId,
    });

    return manager.save(MediaResource, media);
  }

  async getImportJobById(id: string, userId: string, isAdmin: boolean): Promise<ImportJob> {
    const job = await this.importJobRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Không tìm thấy import job.');
    }
    if (!isAdmin && job.createdBy !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin import job này.');
    }
    return job;
  }

  async getImportJobs(
    query: QueryImportJobsDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ items: ImportJob[]; total: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.importJobRepo.createQueryBuilder('job');

    if (!isAdmin) {
      qb.andWhere('job.created_by = :userId', { userId });
    }

    if (query.status) {
      qb.andWhere('job.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('job.created_at >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('job.created_at <= :to', { to: query.to });
    }

    qb.orderBy('job.created_at', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async submitForReview(
    questionIds: string[],
    userId: string,
    isAdmin: boolean,
  ): Promise<SubmitForReviewResponseDto> {
    if (!questionIds || questionIds.length === 0) {
      return { submittedCount: 0, submittedIds: [], skipped: [] };
    }

    const questions = await this.questionRepo.find({
      where: { id: In(questionIds) },
      relations: { options: true, questionGroup: true, part: true },
    });

    const submittedIdsSet = new Set<string>();
    const skipped: SkippedReviewItemDto[] = [];
    const processedGroupIds = new Set<string>();

    for (const q of questions) {
      // If belongs to a QuestionGroup, apply Group Atomicity (003-PMR #5)
      if (q.questionGroupId) {
        if (processedGroupIds.has(q.questionGroupId)) {
          continue;
        }
        processedGroupIds.add(q.questionGroupId);

        const groupQuestions = await this.questionRepo.find({
          where: { questionGroupId: q.questionGroupId },
          relations: { options: true, part: true },
        });

        // Validate all child questions in group
        let groupValid = true;
        let failReason = '';

        for (const child of groupQuestions) {
          if (!isAdmin && child.createdBy !== userId) {
            groupValid = false;
            failReason = 'Bạn không có quyền sở hữu câu hỏi trong nhóm này.';
            break;
          }
          if (
            child.status !== QuestionStatus.DRAFT &&
            child.status !== QuestionStatus.REVISION_REQUESTED
          ) {
            groupValid = false;
            failReason = `Câu hỏi trong nhóm có trạng thái không hợp lệ (${child.status}) để gửi duyệt.`;
            break;
          }
          const childPartNumber = child.part?.partNumber;
          const isContentRequired = ![1, 2, 6].includes(childPartNumber as number);
          if (isContentRequired && (!child.content || child.content.trim() === '')) {
            groupValid = false;
            failReason = `Câu hỏi trong nhóm thuộc Part ${childPartNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`;
            break;
          }
          if (!child.options || child.options.length < 3) {
            groupValid = false;
            failReason = 'Câu hỏi trong nhóm chưa có đủ tối thiểu 3 lựa chọn đáp án.';
            break;
          }
          const isOptionContentRequired = ![1, 2].includes(childPartNumber as number);
          if (
            isOptionContentRequired &&
            child.options.some((opt) => !opt.content || opt.content.trim() === '')
          ) {
            groupValid = false;
            failReason = `Các lựa chọn đáp án của Part ${childPartNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`;
            break;
          }
          const hasCorrect = child.options.some((opt) => opt.isCorrect);
          if (!hasCorrect) {
            groupValid = false;
            failReason = 'Câu hỏi trong nhóm chưa được thiết lập đáp án đúng.';
            break;
          }
        }

        if (!groupValid) {
          for (const child of groupQuestions) {
            skipped.push({ id: child.id, reason: failReason });
          }
        } else {
          for (const child of groupQuestions) {
            child.status = QuestionStatus.PENDING_REVIEW;
            child.version = (child.version || 1) + 1;
            await this.questionRepo.save(child);
            submittedIdsSet.add(child.id);
          }
        }
      } else {
        // Standalone question
        if (!isAdmin && q.createdBy !== userId) {
          skipped.push({
            id: q.id,
            reason: 'Bạn không có quyền sở hữu câu hỏi này.',
          });
          continue;
        }
        if (q.status !== QuestionStatus.DRAFT && q.status !== QuestionStatus.REVISION_REQUESTED) {
          skipped.push({
            id: q.id,
            reason: `Trạng thái hiện tại (${q.status}) không cho phép gửi duyệt.`,
          });
          continue;
        }
        const partNumber = q.part?.partNumber;
        const isContentRequired = ![1, 2, 6].includes(partNumber as number);
        if (isContentRequired && (!q.content || q.content.trim() === '')) {
          skipped.push({
            id: q.id,
            reason: `Câu hỏi thuộc Part ${partNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`,
          });
          continue;
        }
        if (!q.options || q.options.length < 3) {
          skipped.push({
            id: q.id,
            reason: 'Câu hỏi chưa có đủ tối thiểu 3 lựa chọn đáp án.',
          });
          continue;
        }
        const isOptionContentRequired = ![1, 2].includes(partNumber as number);
        if (
          isOptionContentRequired &&
          q.options.some((opt) => !opt.content || opt.content.trim() === '')
        ) {
          skipped.push({
            id: q.id,
            reason: `Các lựa chọn đáp án của Part ${partNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`,
          });
          continue;
        }
        const hasCorrect = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          skipped.push({
            id: q.id,
            reason: 'Câu hỏi chưa được thiết lập đáp án đúng.',
          });
          continue;
        }

        q.status = QuestionStatus.PENDING_REVIEW;
        q.version = (q.version || 1) + 1;
        await this.questionRepo.save(q);
        submittedIdsSet.add(q.id);
      }
    }

    const submittedIds = Array.from(submittedIdsSet);
    return {
      submittedCount: submittedIds.length,
      submittedIds,
      skipped,
    };
  }
}
