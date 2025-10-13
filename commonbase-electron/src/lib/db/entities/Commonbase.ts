import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Embedding } from './Embedding';

export interface CommonbaseMetadata {
  title?: string;
  author?: string; // For file uploads, this will be the file name
  source?: string;
  type?: string;
  filePath?: string; // Local file path for file uploads
  fileSize?: number;
  mimeType?: string;
  links?: string[];
  backlinks?: string[];
  [key: string]: any;
}

@Entity('commonbase')
export class Commonbase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  data: string;

  @Column('jsonb', { default: {} })
  metadata: CommonbaseMetadata;

  @CreateDateColumn({ name: 'created' })
  created: Date;

  @UpdateDateColumn({ name: 'updated' })
  updated: Date;

  @OneToOne(() => Embedding, embedding => embedding.commonbase)
  embedding?: Embedding;
}