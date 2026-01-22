import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DB_TYPE,
  ENV__DB_URL_NAME,
  ENV__IS_DEV,
  ENV__SYNC_DB_SCHEMA,
} from './constants/global.constants';
import {
  AuthUser,
  Card,
  Member,
  MemberMetric,
  Program,
  Promotion,
  Redemption,
  Reward,
  Transaction,
} from './entities';
import {
  DatabaseService,
  HttpInterceptorProvider,
  OutdatedMetrics,
  PrefixNamingStrategy,
  UtilityService,
} from './providers';

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
          synchronize: config.get(ENV__SYNC_DB_SCHEMA) ? true : false,
          extra: { max: 10 },
          namingStrategy: new PrefixNamingStrategy(prefix),
        };
      },
    }),
    TypeOrmModule.forFeature([
      AuthUser,
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
    UtilityService,
    OutdatedMetrics,
  ],
  exports: [HttpModule, ConfigModule, DatabaseService, UtilityService],
})
export class CommonModule {}
