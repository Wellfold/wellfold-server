import { ConsoleModule } from '@/console.module';
import * as dotenv from 'dotenv';
import { BootstrapConsole } from 'nestjs-console';
async function bootstrap() {
  dotenv.config();
  const bootstrap = new BootstrapConsole({
    module: ConsoleModule,
    useDecorators: true,
  });

  bootstrap.init().then(async (app) => {
    try {
      await app.init();
      await bootstrap.boot();
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  });
}

bootstrap();
