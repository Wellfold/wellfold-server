import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { LoyalizeController } from './loyalize.controller';
import { LoyalizeService } from './loyalize.service';

@Module({
  imports: [CommonModule],
  controllers: [LoyalizeController],
  providers: [LoyalizeService],
  exports: [LoyalizeService],
})
export class LoyalizeModule {}
