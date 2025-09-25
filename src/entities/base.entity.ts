import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'now()',
    onUpdate: 'now()',
  })
  updated_at: Date;
}
