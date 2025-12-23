import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  HasExternalUuid,
  HasInternalCreatedUpdated,
} from '../types/common.types';

export enum IntegrationStatus {
  COMPLETE = `completed`,
  INCOMPLETE = `incomplete`,
  NOT_QUALIFIED = `not_qualified`,
}

@Entity(`cards`)
export class Card implements HasExternalUuid, HasInternalCreatedUpdated {
  @PrimaryGeneratedColumn({ type: `bigint` })
  id: string;

  @PrimaryColumn({ type: `text` })
  externalUuid: string;

  @Column({ type: `timestamptz` })
  created: Date;

  @Column({ type: `varchar`, length: 4 })
  last4Digits: string;

  @Column({ type: `varchar`, length: 20 })
  scheme: string;

  @Column({ type: `varchar`, length: 2 })
  expiryMonth: string;

  @Column({ type: `varchar`, length: 4 })
  expiryYear: string;

  @Column({ type: `boolean`, default: true })
  active: boolean;

  @Index()
  @Column({ type: `text` })
  memberId: string;

  @Column({ type: `varchar`, length: 100, nullable: true })
  nickname: string | null;

  @Column({
    type: `enum`,
    enum: IntegrationStatus,
    default: IntegrationStatus.COMPLETE,
  })
  integrationStatus: IntegrationStatus;

  @CreateDateColumn({ type: `timestamptz` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz` })
  updatedInternally: Date;
}
