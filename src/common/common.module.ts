import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DB_TYPE,
  ENV__DB_URL_NAME,
  ENV__IS_DEV,
} from './constants/global.constants';
import {
  Card,
  Member,
  MemberMetric,
  Program,
  Promotion,
  Redemption,
  Reward,
  Transaction,
} from './entities';

import { DatabaseService } from './providers/database.service';
import { HttpInterceptorProvider } from './providers/http.interceptor';
import { PrefixNamingStrategy } from './providers/prefix-naming.strategy';
import { UtilityService } from './providers/utility.service';

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
    TypeOrmModule.forFeature([
      Card,
      Member,
      MemberMetric,
      Redemption,
      Reward,
      Program,
      Promotion,
      Transaction,
    ]),
    HttpModule.register({
      timeout: 200000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [
    DatabaseService,
    HttpInterceptorProvider,
    DatabaseService,
    UtilityService,
  ],
  exports: [HttpModule, ConfigModule, DatabaseService, UtilityService],
})
export class CommonModule {}
