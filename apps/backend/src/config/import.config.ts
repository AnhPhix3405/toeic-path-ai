export const IMPORT_LIMITS = {
  MAX_EXCEL_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_ZIP_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_UNCOMPRESSED_SIZE_BYTES: 150 * 1024 * 1024, // 150MB Zip Bomb defense
  MAX_ZIP_ENTRIES_COUNT: 500, // Tối đa 500 file trong ZIP
  ASYNC_ROW_THRESHOLD: 100, // >= 100 dòng xử lý qua BullMQ
  MAX_ROWS_LIMIT: 1000,
  ALLOWED_EXCEL_MIMES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  ALLOWED_ZIP_MIMES: ['application/zip', 'application/x-zip-compressed'],
  QUEUE_NAME: 'questions-import-queue',
  JOB_NAME: 'process-questions-import',
};
