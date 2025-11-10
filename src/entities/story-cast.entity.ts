import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('story_casts')
export class StoryCast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column({ nullable: true })
  story_id?: string;

  @Column({ nullable: true })
  name?: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  picture?: string;

  @Column({ default: '' })
  cast_id: string;
}
