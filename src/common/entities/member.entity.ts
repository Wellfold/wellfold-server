import {
  HasExternalUuid,
  HasInternalCreatedUpdated,
} from './../types/common.types';
// member.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthUser } from './auth.user.entity';
import { Card } from './card.entity';
import { MemberMetric } from './member-metric.entity';
import { Redemption } from './redemption.entity';
import { Transaction } from './transaction.entity';
import { UserPromotionStatus } from './user-promotion-status.entity';

@Entity(`users`)
export class Member implements HasExternalUuid, HasInternalCreatedUpdated {
  @Generated(`increment`)
  @Column({ type: `bigint`, name: `numeric_id`, unique: true, nullable: true })
  numericId: number;

  @PrimaryGeneratedColumn(`uuid`, { name: `id` })
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

  @Column({ type: `uuid`, name: `auth_user_id`, nullable: true })
  authUserId?: string;

  @ManyToOne(() => AuthUser, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({
    name: `auth_user_id`,
    referencedColumnName: `id`,
  })
  authUser?: AuthUser;

  @Column({ type: `text`, name: `external_id`, nullable: true })
  wellfoldArbitraryExternalId: string;

  @Column({ type: `boolean`, default: true, nullable: true, name: `is_active` })
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

  @OneToMany(
    () => UserPromotionStatus,
    (promotionStatus) => promotionStatus.user,
  )
  promotionStatusList!: UserPromotionStatus[];

  @OneToMany(() => Transaction, (transaction) => transaction.member)
  transactions?: Transaction[];

  @OneToMany(() => Card, (card) => card.member)
  cards?: Card[];

  @OneToMany(() => Redemption, (redemption) => redemption.member)
  redemptions?: Redemption[];

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
