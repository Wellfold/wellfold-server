import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity(`adjustment_categories`)
export class AdjustmentCategory {
  @PrimaryGeneratedColumn({
    type: `bigint`,
  })
  id: string;

  @CreateDateColumn({
    name: `created_at`,
    type: `timestamptz`,
    default: () => `now()`,
  })
  created: Date;

  @Column({
    type: `text`,
  })
  name: string;

  @Column({
    name: `machine_name`,
    type: `text`,
  })
  machineName: string;

  @Column({
    name: `app_label`,
    type: `text`,
  })
  appLabel: string;
}
