import { CommonModule } from '@/common/common.module';
import { LoyalizeModule } from '@/loyalize/loyalize.module';
import { OliveModule } from '@/olive/olive.module';
import { SyncManagerModule } from '@/sync-manager/sync-manager.module';
import { UserLifecycleModule } from '@/user-lifecycle/user-lifecycle.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    LoyalizeModule,
    OliveModule,
    SyncManagerModule,
    UserLifecycleModule,
  ],
})
export class CoreModule {}
