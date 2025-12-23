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
  ThirdPartyOrigin,
} from '../types/common.types';
import { Reward } from './reward.entity';

@Entity(`transactions`)
@Index([`externalUuid`, `thirdPartyOrigin`], { unique: true })
export class Transaction implements HasExternalUuid, HasInternalCreatedUpdated {
  @PrimaryGeneratedColumn({ type: `bigint` })
  id: string;

  /**
   * External transaction identifier
   * - Olive: UUID
   * - Loyalize: stringified numeric id or sid
   */
  @Index()
  @Column({ type: `varchar`, length: 64 })
  externalUuid: string;

  /**
   * Olive | Loyalize
   */
  @Index()
  @Column({ type: `varchar` })
  thirdPartyOrigin: ThirdPartyOrigin;

  /* -----------------------------
   * Shared / normalized identity
   * ----------------------------- */

  @Index()
  @Column({ type: `text`, nullable: true })
  oliveMemberId?: string;

  @Index()
  @Column({ type: `text`, nullable: true })
  loyalizeShopperId: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  storeId: string | null; // UUID (Olive) or numeric/string (Loyalize)

  @Column({ type: `varchar`, nullable: true })
  storeName: string | null; // Loyalize-only

  @Index()
  @Column({ type: `uuid`, nullable: true })
  cardId: string | null; // Olive-only

  @Index()
  @Column({ type: `uuid`, nullable: true })
  brandId: string | null; // Olive-only

  /* -----------------------------
   * Amounts (normalized)
   * ----------------------------- */

  @Column({ type: `varchar`, length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  amount: string | null; // Olive.amount OR Loyalize.saleAmount

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  rewardAmount: string | null; // Olive.rewardAmount OR Loyalize.shopperCommission

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  wellfoldCalculatedReward: string | null;

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  roundedAmount: string | null; // Olive-only

  @Column({ type: `numeric`, precision: 18, scale: 2, nullable: true })
  matchingAmount: string | null; // Olive-only

  /* -----------------------------
   * Dates (union model)
   * ----------------------------- */

  @Column({ type: `timestamptz` })
  created: Date; // purchaseDate (Loyalize) OR created (Olive)

  @Column({ type: `timestamptz`, nullable: true })
  pendingDate: Date | null; // Loyalize-only

  @Column({ type: `timestamptz`, nullable: true })
  availabilityDate: Date | null; // Loyalize-only

  @Column({ type: `timestamptz`, nullable: true })
  settlementDate: Date | null; // Olive OR Loyalize paymentDate

  /* -----------------------------
   * Status / metadata
   * ----------------------------- */

  @Index()
  @Column({ type: `varchar`, nullable: true })
  status: string | null; // Loyalize: PENDING, AVAILABLE, PAID

  @Column({ type: `boolean`, default: false })
  settled: boolean; // derived

  @Column({ type: `varchar`, nullable: true })
  orderNumber: string | null; // Loyalize-only

  @Column({ type: `varchar`, nullable: true })
  tier: string | null; // Loyalize-only

  @Column({ type: `varchar`, nullable: true })
  adminComment: string | null; // Loyalize-only

  @Column({ type: `int`, nullable: true })
  merchantCategoryCode: number | null; // Olive-only

  @Column({ type: `varchar`, length: 4, nullable: true })
  cardLast4Digits: string | null; // Olive-only

  /* -----------------------------
   * Embedded reward (Olive)
   * ----------------------------- */

  @Column(() => Reward)
  reward: Reward;

  @Column({ type: `boolean`, nullable: true })
  isRedemption: boolean;

  /* -----------------------------
   * Internal bookkeeping
   * ----------------------------- */

  @CreateDateColumn({ type: `timestamptz` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz` })
  updatedInternally: Date;
}
