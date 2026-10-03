export const MEDIA_LIMITS = {
  AUDIO: {
    MAX_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB
    ALLOWED_MIME_TYPES: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'],
    ALLOWED_EXTENSIONS: ['.mp3', '.wav'],
  },
  IMAGE: {
    MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  BATCH: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 10,
  },
  PRESIGNED_URL_TTL_SECONDS: 900, // 15 minutes
} as const;
