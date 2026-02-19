import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioModule } from 'nestjs-twilio';
import {
  DB_TYPE,
  ENV__DB_URL_NAME,
  ENV__IS_DEV,
  ENV__SYNC_DB_SCHEMA,
  ENV__TWILIO_ACCOUNT_SID,
  ENV__TWILIO_AUTH_TOKEN,
} from './constants/global.constants';
import {
  AuthUser,
  Card,
  ManualAdjustment,
  Member,
  MemberMetric,
  Program,
  Promotion,
  Redemption,
  Reward,
  Transaction,
  UserPromotionStatus,
} from './entities';
import {
  DatabaseService,
  HttpInterceptorProvider,
  OutdatedMetrics,
  PrefixNamingStrategy,
  SmsService,
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
    TwilioModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        accountSid: cfg.get(ENV__TWILIO_ACCOUNT_SID),
        authToken: cfg.get(ENV__TWILIO_AUTH_TOKEN),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      AuthUser,
      Card,
      ManualAdjustment,
      Member,
      MemberMetric,
      Redemption,
      Reward,
      Program,
      Promotion,
      Transaction,
      UserPromotionStatus,
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
    SmsService,
  ],
  exports: [
    HttpModule,
    ConfigModule,
    DatabaseService,
    UtilityService,
    SmsService,
  ],
})
export class CommonModule {}
