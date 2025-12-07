import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { OliveController } from './olive.controller';
import { OliveService } from './olive.service';

@Module({
  imports: [CommonModule],
  providers: [OliveService],
  exports: [OliveService],
  controllers: [OliveController],
})
export class OliveModule {}
