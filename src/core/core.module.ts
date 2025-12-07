import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { LoyalizeModule } from '../loyalize/loyalize.module';
import { OliveModule } from '../olive/olive.module';
import { SyncManagerModule } from '../sync-manager/sync-manager.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    LoyalizeModule,
    OliveModule,
    SyncManagerModule,
  ],
})
export class CoreModule {}
