import * as schema from './schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/commonbase-electron';

let dbInstance: any = null;

// Lazy database connection to avoid circular dependencies
export const getDb = () => {
  if (!dbInstance) {
    // Lazy import to avoid bundling issues
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { Pool } = require('pg');

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
};

// Export for backward compatibility
export const db = new Proxy({}, {
  get(_target, prop) {
    return getDb()[prop];
  }
});

export * from './schema';