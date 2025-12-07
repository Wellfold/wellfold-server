import { CoreModule } from '@/core/core.module';
import { Module } from '@nestjs/common';
import { ConsoleModule as NestJsConsoleModule } from 'nestjs-console';

@Module({
  imports: [NestJsConsoleModule, CoreModule],
})
export class ConsoleModule {}
