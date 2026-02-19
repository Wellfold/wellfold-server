import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { UserLifecycleController } from './user-lifecycle.controller';
import { UserLifecycleService } from './user-lifecycle.service';

@Module({
  imports: [CommonModule],
  providers: [UserLifecycleService],
  exports: [UserLifecycleService],
  controllers: [UserLifecycleController],
})
export class UserLifecycleModule {}
