import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserMetricEnum } from '../constants';
import { Member } from './member.entity';

@Entity(`user_metrics`)
export class MemberMetric {
  @PrimaryGeneratedColumn({ type: `bigint`, name: `id` })
  numericId: string;

  @Index()
  @ManyToOne(() => Member, (member) => member.metrics, {
    nullable: true,
  })
  @JoinColumn({
    name: `wellfold_user_numeric_id`,
    referencedColumnName: `numericId`,
  })
  member?: Member;

  @Index()
  @Column({ type: `text` })
  type: UserMetricEnum;

  @Index()
  @Column({ type: `text`, name: `unique_member_metric_id`, unique: true })
  uniqueMemberMetricId: string;

  @Column({
    type: `numeric`,
    precision: 10,
    scale: 2,
    nullable: true,
  })
  value?: string;

  @CreateDateColumn({ type: `timestamptz`, name: `created` })
  createdInternally: Date;

  @UpdateDateColumn({ type: `timestamptz`, name: `updated` })
  updatedInternally: Date;
}
