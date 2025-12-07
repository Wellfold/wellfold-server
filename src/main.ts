import { AppModule } from '@/app.module';
import { API_PREFIX } from '@/common/constants/global.constants';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  await app.listen(3000);
}
bootstrap();
