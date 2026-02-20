import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserMetricEnum } from '../constants';
import { AdjustmentCategory } from './adjustment-category.entity';
import { Member } from './member.entity';

@Entity(`manual_adjustments`)
export class ManualAdjustment {
  @PrimaryGeneratedColumn({ type: `bigint`, name: `id` })
  numericId: string;

  @Index()
  @ManyToOne(() => Member)
  @JoinColumn({
    name: `wellfold_user_numeric_id`,
    referencedColumnName: `numericId`,
  })
  user?: Member;

  @Index()
  @Column({
    type: `enum`,
    enum: UserMetricEnum,
    enumName: `user_status_enum`,
    default: UserMetricEnum.REWARDS_BALANCE,
  })
  type: UserMetricEnum;

  @Column({
    type: `numeric`,
    precision: 18,
    scale: 2,
    name: `adjustment_amount`,
  })
  adjustmentAmount: string;

  @CreateDateColumn({
    type: `timestamptz`,
    name: `created`,
    default: () => `now()`,
  })
  created: Date;

  @Column({ type: `text`, nullable: true, name: `notes` })
  notes?: string;

  @ManyToOne(() => AdjustmentCategory, { nullable: true })
  @JoinColumn({
    name: `adjustment_category`,
    referencedColumnName: `id`,
  })
  adjustmentCategory?: AdjustmentCategory;
}
