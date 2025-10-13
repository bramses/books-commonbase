import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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

export const commonbase = sqliteTable('commonbase', {
  id: text('id')
    .primaryKey()
    .default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))))`),
  data: text('data').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<CommonbaseMetadata>().default({}),
  created: text('created').default(sql`CURRENT_TIMESTAMP`),
  updated: text('updated').default(sql`CURRENT_TIMESTAMP`),
});

export const embeddings = sqliteTable('embeddings', {
  id: text('id')
    .primaryKey()
    .references(() => commonbase.id, { onDelete: 'cascade' }),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>().notNull(),
});

export type Commonbase = typeof commonbase.$inferSelect;
export type NewCommonbase = typeof commonbase.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;