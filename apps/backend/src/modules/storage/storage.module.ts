import { Module } from '@nestjs/common';
import { SupabaseStorageAdapter } from './adapters/supabase-storage.adapter';
import { STORAGE_SERVICE } from './storage.constants';

@Module({
  providers: [
    SupabaseStorageAdapter,
    { provide: STORAGE_SERVICE, useExisting: SupabaseStorageAdapter },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
