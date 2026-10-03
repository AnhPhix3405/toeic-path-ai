import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'supabase',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  avatarBucket: process.env.STORAGE_BUCKET_AVATARS,
  mediaBucket: process.env.STORAGE_BUCKET_MEDIA ?? 'media',
}));
