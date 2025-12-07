import { OliveModule } from '@/olive/olive.module';
import { Module } from '@nestjs/common';
import { CommonModule } from './../common/common.module';
import { SyncManagerService } from './providers/sync-manager.provider';

@Module({
  imports: [CommonModule, OliveModule],
  providers: [SyncManagerService],
})
export class SyncManagerModule {}
