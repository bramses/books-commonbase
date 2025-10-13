import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Commonbase } from './Commonbase';

@Entity('embeddings')
export class Embedding {
  @PrimaryColumn('uuid')
  id: string;

  @Column('vector', { length: 1536 })
  embedding: number[];

  @OneToOne(() => Commonbase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  commonbase: Commonbase;
}