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
      process.on(`unhandledRejection`, (reason) => {
        console.error(`UNHANDLED PROMISE REJECTION`);
        console.error(reason);
        process.exit(1);
      });
      process.on(`uncaughtException`, (err) => {
        console.error(`UNCAUGHT EXCEPTION`);
        console.error(err);
        process.exit(1);
      });
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  });
}

bootstrap();
