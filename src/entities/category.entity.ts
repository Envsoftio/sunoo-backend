import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Book } from './book.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'now()',
    name: 'created_at',
  })
  created_at: Date;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'now()',
    name: 'updated_at',
  })
  updated_at: Date;
  @Column({ name: 'name' })
  name: string;

  @Column({ unique: true, name: 'slug' })
  slug: string;

  @Column({ nullable: true, name: 'description' })
  description?: string;

  @Column({ nullable: true, name: 'icon_url' })
  icon_url?: string;

  @Column({ nullable: true, name: 'color' })
  color?: string;

  @Column({ default: true, name: 'is_active' })
  is_active: boolean;

  @Column({ nullable: true, name: 'sort_order' })
  sort_order?: number;

  @Column({ default: false, name: 'featured' })
  featured: boolean;

  // Relationships
  @OneToMany(() => Book, book => book.category)
  books: Book[];
}
