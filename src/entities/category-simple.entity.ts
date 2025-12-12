import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class CategorySimple {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  banner_url?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  sort_order?: number;

  @Column({ default: false })
  featured: boolean;
}
