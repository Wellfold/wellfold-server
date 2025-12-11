// transaction.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  HasExternalUuid,
  HasInternalCreatedUpdated,
} from '../types/common.types';
import { Reward } from './reward.entity';

@Entity(`transaction`)
export class Transaction implements HasExternalUuid, HasInternalCreatedUpdated {
  @PrimaryGeneratedColumn({ type: `bigint` })
  id: string;

  @Index()
  @Column({ type: `uuid`, unique: true })
  externalUuid: string;

  @Index()
  @Column({ type: `uuid`, nullable: true })
  storeId: string;

  @Index()
  @Column({ type: `uuid` })
  cardId: string;

  @Index()
  @Column({ type: `uuid` })
  memberId: string;

  @Index()
  @Column({ type: `uuid`, nullable: true })
  brandId: string;

  @Column({ type: `int`, nullable: true })
  merchantCategoryCode: number | null;

  @Column({ type: `varchar`, nullable: true })
  currencyCode: string | null;

  @CreateDateColumn({ type: `timestamptz` })
  created: Date;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  roundedAmount: string | null;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  amount: string | null;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  matchingAmount: string | null;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  rewardAmount: string | null;

  @Column({ type: `int`, default: 0 })
  availableOfferCount: number;

  @Column({ type: `varchar`, length: 4, nullable: true })
  cardLast4Digits: string | null;

  @Column({ type: `boolean`, default: false })
  settled: boolean;

  @Column({ type: `timestamptz`, nullable: true })
  settlementDate: Date | null;

  @Column(() => Reward)
  reward: Reward;

  @Column({ type: `boolean`, nullable: true })
  isRedemption: boolean;

  @CreateDateColumn({ type: `timestamptz` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz` })
  updatedInternally: Date;
}
