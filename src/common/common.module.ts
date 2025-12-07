import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DB_TYPE,
  ENV__DB_URL_NAME,
  ENV__IS_DEV,
} from './constants/global.constants';
import { Member, Reward, Transaction } from './entities';
import { DatabaseService } from './providers/database.service';
import { HttpInterceptorProvider } from './providers/http.interceptor';
import { PrefixNamingStrategy } from './providers/prefix-naming.strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get(ENV__IS_DEV) ? true : false;
        const prefix = isDev ? `dev__` : ``;
        return {
          type: DB_TYPE,
          url: config.get(ENV__DB_URL_NAME),
          ssl: { rejectUnauthorized: false },
          autoLoadEntities: true,
          synchronize: true,
          extra: { max: 10 },
          namingStrategy: new PrefixNamingStrategy(prefix),
        };
      },
    }),
    TypeOrmModule.forFeature([Member, Reward, Transaction]),
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [DatabaseService, HttpInterceptorProvider, DatabaseService],
  exports: [HttpModule, ConfigModule, DatabaseService],
})
export class CommonModule {}
