import { Column, Entity, PrimaryColumn } from 'typeorm';
import { PromotionCapType } from '../types/common.types';

@Entity(`promotions`)
export class Promotion {
  @PrimaryColumn({ type: `bigint`, name: `id` })
  id!: string;

  @Column({ type: `text`, nullable: true, name: `name` })
  name?: string;

  @Column({ type: `text`, nullable: true, name: `notes` })
  notes?: string;

  @Column({ type: `text`, nullable: true, name: `program_id` })
  programId?: string;

  @Column({ type: `jsonb`, nullable: true, name: `mcc_codes` })
  mccCodes?: number[];

  @Column({ type: `timestamptz`, nullable: true, name: `start_date` })
  startDate?: Date;

  @Column({ type: `timestamptz`, nullable: true, name: `end_date` })
  endDate?: Date;

  @Column({ type: `boolean`, nullable: true, name: `is_active` })
  isActive?: boolean;

  @Column({ type: `timestamptz`, nullable: true, name: `created_at` })
  createdAt?: Date;

  @Column({ type: `bigint`, nullable: true, name: `value` })
  value?: string;

  @Column({ type: `text`, nullable: true, name: `type` })
  type?: string;

  @Column({ type: `text`, nullable: true, name: `cap_type` })
  capType?: PromotionCapType;

  @Column({ type: `text`, nullable: true, name: `program_name` })
  programName?: string;

  @Column({ type: `text`, nullable: true, name: `example_brands` })
  exampleBrands?: string;

  @Column({ type: `bigint`, nullable: true, name: `max_value` })
  maxValue?: string;

  @Column({ type: `boolean`, nullable: true, name: `is_visible` })
  isVisible?: boolean;
}
