import { HasExternalUuid } from './../types/common.types';
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
export class Member implements HasExternalUuid {
  @PrimaryGeneratedColumn({ type: `bigint` })
  id: string;

  @Index()
  @Column({ type: `uuid`, unique: true })
  externalUuid: string;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  firstName: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  lastName: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  phone: string | null;

  @Index()
  @Column({ type: `varchar`, nullable: true })
  programId: string | null;

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
