import { QuestionStatus } from '../enums/question-status.enum';
import { MediaResourceType } from '../enums/media-resource-type.enum';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';
import { QuestionReviewAction } from '../enums/question-review-action.enum';
import { ImportJobStatus } from '../enums/import-job-status.enum';
import { Question } from './question.entity';
import { MediaResource } from './media-resource.entity';
import { QuestionHistory } from './question-history.entity';
import { QuestionReview } from './question-review.entity';
import { ImportJob } from './import-job.entity';

describe('Sprint 4 Advanced Question Bank Entities & Enums', () => {
  describe('Enums Definition', () => {
    it('should have all 5 QuestionStatus values', () => {
      expect(QuestionStatus.DRAFT).toBe('draft');
      expect(QuestionStatus.PENDING_REVIEW).toBe('pending_review');
      expect(QuestionStatus.PUBLISHED).toBe('published');
      expect(QuestionStatus.REVISION_REQUESTED).toBe('revision_requested');
      expect(QuestionStatus.REJECTED).toBe('rejected');
    });

    it('should have MediaResourceType values for audio and image', () => {
      expect(MediaResourceType.AUDIO).toBe('audio');
      expect(MediaResourceType.IMAGE).toBe('image');
    });

    it('should have all 5 QuestionHistoryChangeType values including resubmitted', () => {
      expect(QuestionHistoryChangeType.CREATED).toBe('created');
      expect(QuestionHistoryChangeType.UPDATED).toBe('updated');
      expect(QuestionHistoryChangeType.RESUBMITTED).toBe('resubmitted');
      expect(QuestionHistoryChangeType.STATUS_CHANGED).toBe('status_changed');
      expect(QuestionHistoryChangeType.QUICK_FIXED).toBe('quick_fixed');
    });

    it('should have all 4 QuestionReviewAction values', () => {
      expect(QuestionReviewAction.APPROVED).toBe('approved');
      expect(QuestionReviewAction.REVISION_REQUESTED).toBe('revision_requested');
      expect(QuestionReviewAction.REJECTED).toBe('rejected');
      expect(QuestionReviewAction.QUICK_FIX_APPROVED).toBe('quick_fix_approved');
    });

    it('should have all 5 ImportJobStatus values', () => {
      expect(ImportJobStatus.PENDING).toBe('pending');
      expect(ImportJobStatus.PROCESSING).toBe('processing');
      expect(ImportJobStatus.COMPLETED).toBe('completed');
      expect(ImportJobStatus.FAILED).toBe('failed');
      expect(ImportJobStatus.PARTIALLY_COMPLETED).toBe('partially_completed');
    });
  });

  describe('Entities Instantiation', () => {
    it('should instantiate Question with version column and advanced relations', () => {
      const question = new Question();
      question.id = '10000000-0000-4000-8000-000000000001';
      question.content = 'Select the best answer.';
      question.status = QuestionStatus.PENDING_REVIEW;
      question.version = 1;
      question.mediaResources = [];
      question.histories = [];
      question.reviews = [];

      expect(question.status).toBe('pending_review');
      expect(question.version).toBe(1);
      expect(question.mediaResources).toEqual([]);
      expect(question.histories).toEqual([]);
      expect(question.reviews).toEqual([]);
    });

    it('should instantiate MediaResource with soft-delete fields', () => {
      const media = new MediaResource();
      media.id = '20000000-0000-4000-8000-000000000001';
      media.fileName = 'audio_part3.mp3';
      media.fileUrl = 'https://storage.example.com/audio/audio_part3.mp3';
      media.resourceType = MediaResourceType.AUDIO;
      media.mimeType = 'audio/mpeg';
      media.fileSize = 1048576;
      media.questionId = '10000000-0000-4000-8000-000000000001';
      media.questionGroupId = null;
      media.isDeleted = false;
      media.deletedAt = null;
      media.createdBy = '30000000-0000-4000-8000-000000000001';

      expect(media.resourceType).toBe('audio');
      expect(media.isDeleted).toBe(false);
      expect(media.questionId).toBe('10000000-0000-4000-8000-000000000001');
      expect(media.questionGroupId).toBeNull();
    });

    it('should instantiate QuestionHistory with jsonb snapshot', () => {
      const history = new QuestionHistory();
      history.id = '40000000-0000-4000-8000-000000000001';
      history.questionId = '10000000-0000-4000-8000-000000000001';
      history.changedBy = '30000000-0000-4000-8000-000000000001';
      history.changeType = QuestionHistoryChangeType.RESUBMITTED;
      history.snapshotBefore = { content: 'Old content' };
      history.snapshotAfter = { content: 'New fixed content' };
      history.comment = 'Fixed grammar in options per reviewer feedback';

      expect(history.changeType).toBe('resubmitted');
      expect(history.snapshotBefore).toEqual({ content: 'Old content' });
      expect(history.snapshotAfter).toEqual({ content: 'New fixed content' });
    });

    it('should instantiate QuestionReview with reviewer action and feedback', () => {
      const review = new QuestionReview();
      review.id = '50000000-0000-4000-8000-000000000001';
      review.questionId = '10000000-0000-4000-8000-000000000001';
      review.reviewerId = '30000000-0000-4000-8000-000000000002';
      review.action = QuestionReviewAction.REVISION_REQUESTED;
      review.feedback = 'Please fix option C explanation.';
      review.version = 1;

      expect(review.action).toBe('revision_requested');
      expect(review.feedback).toBe('Please fix option C explanation.');
      expect(review.version).toBe(1);
    });

    it('should instantiate ImportJob with summary counts and error details', () => {
      const job = new ImportJob();
      job.id = '60000000-0000-4000-8000-000000000001';
      job.fileName = 'toeic_questions_batch1.xlsx';
      job.fileType = 'excel';
      job.status = ImportJobStatus.PARTIALLY_COMPLETED;
      job.targetStatus = QuestionStatus.DRAFT;
      job.totalRows = 100;
      job.successCount = 95;
      job.errorCount = 5;
      job.createdGroupsCount = 10;
      job.errorDetails = [{ row: 12, error: 'Missing correct answer' }];
      job.createdBy = '30000000-0000-4000-8000-000000000001';

      expect(job.status).toBe('partially_completed');
      expect(job.targetStatus).toBe('draft');
      expect(job.successCount).toBe(95);
      expect(job.errorCount).toBe(5);
      expect(job.createdGroupsCount).toBe(10);
      expect(job.errorDetails?.length).toBe(1);
    });
  });
});
