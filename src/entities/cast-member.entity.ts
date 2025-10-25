import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cast_members')
export class CastMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column()
  name: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  picture?: string;

  @Column({ nullable: true })
  email?: string;
}
