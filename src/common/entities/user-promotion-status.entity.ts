import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Promotion } from './promotion.entity';

@Entity(`user_promotion_status`)
export class UserPromotionStatus {
  @PrimaryGeneratedColumn({ type: `bigint`, name: `id` })
  numericId: string;

  @Index()
  @Column({ type: `text`, name: `unique_promotion_user_id` })
  uniquePromotionUserId: string;

  @Index()
  @ManyToOne(() => Member, (member) => member.metrics, {
    nullable: true,
  })
  @JoinColumn({
    name: `wellfold_user_numeric_id`,
    referencedColumnName: `numericId`,
  })
  user?: Member;

  @Index()
  @ManyToOne(() => Promotion)
  @JoinColumn({
    name: `promotion_id`,
    referencedColumnName: `id`,
  })
  promotion?: Promotion;

  @Index()
  @Column({
    type: `boolean`,
    default: false,
    name: `has_hit_cap`,
  })
  hasHitCap: boolean;
}
