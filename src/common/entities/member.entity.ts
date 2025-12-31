import {
  HasExternalUuid,
  HasInternalCreatedUpdated,
} from './../types/common.types';
// member.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { MemberMetric } from './member-metric.entity';
import { Transaction } from './transaction.entity';

@Entity(`users`)
export class Member implements HasExternalUuid, HasInternalCreatedUpdated {
  @PrimaryGeneratedColumn({ type: `bigint`, name: `numeric_id` })
  numericId: string;

  @Index()
  @Column({ type: `uuid`, unique: true, name: `id`, nullable: true })
  wellfoldId?: string;

  @Index()
  @Column({ type: `text`, unique: true, name: `member_id`, nullable: true })
  externalUuid?: string;

  @Index()
  @Column({ type: `text`, nullable: true, name: `first_name` })
  firstName?: string;

  @Index()
  @Column({ type: `text`, nullable: true, name: `last_name` })
  lastName?: string;

  @Index()
  @Column({ type: `text`, nullable: true })
  phone?: string;

  @Index()
  @Column({ type: `text`, nullable: true })
  email?: string;

  @Index()
  @Column({ type: `text`, name: `zip_code`, nullable: true })
  zipCode?: string;

  @Index()
  @Column({ type: `text`, nullable: true, name: `program_id` })
  programId?: string;

  @Index()
  @Column({ type: `text`, name: `password`, nullable: true })
  password?: string;

  @Index()
  @Column({ type: `uuid`, nullable: true, name: `auth_user_id` })
  authUserId?: string;

  @Column({ type: `text`, name: `external_id`, nullable: true })
  wellfoldArbitraryExternalId: string;

  @Column({ type: `boolean`, default: true, nullable: true })
  isActive: boolean;

  @Column({
    type: `boolean`,
    default: true,
    name: `sms_alerts`,
    nullable: true,
  })
  smsAlerts: boolean;

  @Column({
    type: `boolean`,
    default: true,
    name: `weekly_summaries`,
    nullable: true,
  })
  weeklySummaries: boolean;

  @Column({ type: `int`, default: 0 })
  externalPersonId: number;

  @Column({ type: `timestamptz`, name: `email_linked_date`, nullable: true })
  emailLinkedDate: Date | null;

  @Column({ type: `timestamptz`, name: `card_linked_date`, nullable: true })
  cardLinkedDate: Date | null;

  @Column({ type: `boolean`, default: false, name: `card_linked` })
  cardLinked: boolean;

  @Column({ type: `text`, name: `utm_source`, nullable: true })
  utmSource: string;

  @Column({ type: `text`, name: `utm_medium`, nullable: true })
  utmMedium: string;

  @Column({ type: `text`, name: `utm_campaign`, nullable: true })
  utmCampaign: string;

  @Column({ type: `text`, name: `utm_link`, nullable: true })
  utmLink: string;

  @Index()
  @Column({ type: `timestamptz`, name: `created_at` })
  created: Date;

  @OneToMany(() => MemberMetric, (metric) => metric.member)
  metrics!: MemberMetric[];

  @OneToMany(() => Transaction, (transaction) => transaction.member)
  transactions?: Transaction[];

  @OneToMany(() => Card, (card) => card.member)
  cards?: Card[];

  @UpdateDateColumn({ type: `timestamptz` })
  updated: Date;

  @Column({ type: `timestamptz`, nullable: true })
  tcAcceptedDate: Date | null;

  @Column({ type: `text`, nullable: true })
  referenceAppId?: string;

  @Column({ type: `text`, nullable: true })
  extMemberId?: string;

  @Column({ type: `boolean`, default: false })
  cashbackProgram: boolean;

  @Column({ type: `boolean`, default: false })
  roundingProgram: boolean;

  @Column({ type: `uuid`, nullable: true })
  clientId: string;

  @Column({ type: `int`, default: 0 })
  roundingPeriodTotalMin: number;

  @Column({ type: `int`, default: 0 })
  roundingPeriodTotalMax: number;

  @Column({ type: `int`, default: 0 })
  activeCardCount: number;

  @Column({
    type: `numeric`,
    precision: 10,
    scale: 2,
    nullable: true,
    name: `total_gmv`,
  })
  totalGmv?: string;

  @Column({
    type: `numeric`,
    precision: 10,
    scale: 2,
    nullable: true,
    name: `qualified_gmv`,
  })
  qualifiedGmv?: string;

  @Column({
    type: `numeric`,
    precision: 10,
    scale: 2,
    nullable: true,
    name: `rewards_balance`,
  })
  rewardsBalance?: string;

  @Column({ type: `timestamptz`, nullable: true, name: `metrics_last_updated` })
  metricsLastUpdated: Date;

  @Column({ type: `text`, nullable: true, name: `metrics_calculation_status` })
  metricsCalculationStatus?: string;

  @CreateDateColumn({ type: `timestamptz`, name: `created_internally` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz`, name: `updated_internally` })
  updatedInternally: Date;
}
