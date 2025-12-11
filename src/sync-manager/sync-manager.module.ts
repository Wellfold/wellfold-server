import { OliveModule } from '@/olive/olive.module';
import { Module } from '@nestjs/common';
import { CommonModule } from './../common/common.module';
import { MetricsService } from './providers/metrics.provider';
import { SyncManagerService } from './providers/sync-manager.provider';

@Module({
  imports: [CommonModule, OliveModule],
  providers: [SyncManagerService, MetricsService],
})
export class SyncManagerModule {}
