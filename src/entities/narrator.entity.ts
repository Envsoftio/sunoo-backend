import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('narrators')
export class Narrator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;
  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'numeric', nullable: true })
  phone?: number;

  @Column({ type: 'json', nullable: true })
  social?: any;

  @Column({ type: 'json', nullable: true })
  languages?: any;

  @Column()
  userId: string;

  @Column({ nullable: true })
  chapterCoverURL?: string;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
