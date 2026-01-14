import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: `users`, schema: `auth`, synchronize: false })
export class AuthUser {
  @PrimaryColumn({ type: `uuid`, name: `id` })
  id!: string;
}
