import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Member } from './member.entity';
import { Program } from './program.entity';

@Entity(`redemptions`)
export class Redemption {
  @PrimaryColumn({ type: `uuid` })
  id: string;

  @Column({ type: `text`, nullable: true, name: `member_id` })
  memberId: string | null;

  @Column({ type: `double precision`, nullable: true })
  amount: number | null;

  @Column({ type: `timestamptz`, name: `created_at` })
  createdAt: Date;

  @Column({ type: `text`, nullable: true })
  type: string | null;

  @Column({ type: `text`, nullable: true, name: `external_id` })
  externalId: string | null;

  @Column({ type: `timestamptz`, name: `updated_at`, nullable: true })
  updatedAt: Date | null;

  @Column({ type: `text`, nullable: true, name: `program_id` })
  programId: string | null;

  @Column({ type: `text`, nullable: true, name: `program_name` })
  programName: string | null;

  @ManyToOne(() => Program, { nullable: true })
  @JoinColumn({ name: `program_id`, referencedColumnName: `programId` })
  program?: Program | null;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({
    name: `wellfold_user_numeric_id`,
    referencedColumnName: `numericId`,
  })
  member?: Member | null;
}
