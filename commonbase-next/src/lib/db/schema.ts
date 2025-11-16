import { pgTable, uuid, text, json, timestamp, customType, primaryKey, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom vector type for pgvector
const vector = customType<{ data: number[]; notNull: false; default: false }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1) // Remove [ and ]
      .split(',')
      .map(Number);
  },
});

export const commonbase = pgTable('commonbase', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  data: text('data').notNull(),
  metadata: json('metadata').$type<{
    title?: string;
    source?: string;
    type?: string;
    links?: string[];
    backlinks?: string[];
    [key: string]: any;
  }>().default({}),
  created: timestamp('created').defaultNow().notNull(),
  updated: timestamp('updated').defaultNow().notNull(),
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().references(() => commonbase.id, { onDelete: 'cascade' }),
  embedding: vector('embedding').notNull(),
});

// Books table
export const books = pgTable('book', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  author: text('author').notNull(),
  description: text('description'),
  cover: text('cover'),
  published: timestamp('published'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// ReadBy table (tracks who read which books)
export const readBys = pgTable('readBy', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bookId: uuid('bookId').notNull().references(() => books.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Redundant with user.name for easy access
  when: timestamp('when').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable('message', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  text: text('text').notNull(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'set null' }), // Allow messages from deleted users
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  replyToId: uuid('replyToId').references(() => messages.id, { onDelete: 'set null' }),
  commonbaseId: uuid('commonbaseId').references(() => commonbase.id, { onDelete: 'set null' }),
});

// Reactions table
export const reactions = pgTable('reaction', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid('messageId').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }),
  count: integer('count').notNull().default(1),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Mentions table
export const mentions = pgTable('mention', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid('messageId').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'user' | 'book'
  targetId: uuid('targetId').notNull(), // References users.id or books.id
  targetText: text('targetText').notNull(), // The text that was mentioned (e.g., "@john", "@The Hobbit")
});

// NextAuth.js tables (only created when auth is enabled)
export const users = pgTable("user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified"),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// User API keys table for user-specific API access
export const userApiKeys = pgTable("userApiKey", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // User-friendly name for the key
  keyHash: text("keyHash").notNull().unique(), // Hashed version of the API key
  created: timestamp("created").defaultNow().notNull(),
  lastUsed: timestamp("lastUsed"),
});

// Type definitions (defined after all tables are declared)
export type CommonbaseEntry = typeof commonbase.$inferSelect;
export type NewCommonbaseEntry = typeof commonbase.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;
export type ReadBy = typeof readBys.$inferSelect;
export type NewReadBy = typeof readBys.$inferInsert;