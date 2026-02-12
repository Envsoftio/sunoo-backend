import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('app_settings')
export class AppSettings extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
