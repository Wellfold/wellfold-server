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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity(`member`)
export class Member implements HasExternalUuid, HasInternalCreatedUpdated {
  @PrimaryGeneratedColumn({ type: `bigint`, name: `iterative_id` })
  id: string;

  @Index()
  @Column({ type: `uuid`, unique: true, name: `id`, nullable: true })
  wellfoldId: string;

  @Index()
  @Column({ type: `uuid`, unique: true, name: `member_id` })
  externalUuid: string;

  @Index()
  @Column({ type: `varchar`, nullable: true, name: `first_name` })
  firstName: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true, name: `last_name` })
  lastName: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  phone: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true, name: `program_id` })
  programId: string | null;

  @Column({ type: `float`, default: 0 })
  totalGmv: number;

  @Column({ type: `float`, default: 0 })
  qualifiedGmv: number;

  @Column({ type: `float`, default: 0 })
  rewards: number;

  @Index()
  @Column({ type: `varchar`, nullable: true, name: `auth_user_id` })
  authUserId: string | null;

  @Column({ type: `timestamptz`, nullable: true })
  tcAcceptedDate: Date | null;

  @Column({ type: `varchar`, nullable: true })
  referenceAppId: string | null;

  @Column({ type: `varchar`, nullable: true })
  extMemberId: string | null;

  @Column({ type: `boolean`, default: false })
  cashbackProgram: boolean;

  @Column({ type: `boolean`, default: false })
  roundingProgram: boolean;

  @Column({ type: `uuid` })
  clientId: string;

  @Column({ type: `boolean`, default: true })
  isActive: boolean;

  @Column({ type: `int`, default: 0 })
  externalPersonId: number;

  @CreateDateColumn({ type: `timestamptz` })
  created: Date;

  @UpdateDateColumn({ type: `timestamptz` })
  updated: Date;

  @Column({ type: `int`, default: 0 })
  roundingPeriodTotalMin: number;

  @Column({ type: `int`, default: 0 })
  roundingPeriodTotalMax: number;

  @Column({ type: `int`, default: 0 })
  activeCardCount: number;

  @CreateDateColumn({ type: `timestamptz` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz` })
  updatedInternally: Date;
}
