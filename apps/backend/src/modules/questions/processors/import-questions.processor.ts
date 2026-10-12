import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IMPORT_LIMITS } from '../../../config/import.config';
import { QuestionsImportService } from '../services/questions-import.service';
import { QuestionStatus } from '../enums/question-status.enum';

export interface ImportQuestionsJobData {
  jobId: string;
  storageKey: string;
  fileType: 'excel' | 'zip';
  targetStatus: QuestionStatus;
  userId: string;
}

@Processor(IMPORT_LIMITS.QUEUE_NAME)
export class ImportQuestionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportQuestionsProcessor.name);

  constructor(private readonly questionsImportService: QuestionsImportService) {
    super();
  }

  async process(job: Job<ImportQuestionsJobData>): Promise<void> {
    this.logger.log(`Processing import job ${job.data.jobId}`);
    const { jobId, storageKey, fileType, targetStatus, userId } = job.data;

    await this.questionsImportService.processImportAsync(
      jobId,
      storageKey,
      fileType,
      targetStatus,
      userId,
    );

    this.logger.log(`Completed import job ${jobId}`);
  }
}
