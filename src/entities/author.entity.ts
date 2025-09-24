import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Book } from './book.entity';

@Entity('authors')
export class Author extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Book, book => book.author)
  books: Book[];
}
