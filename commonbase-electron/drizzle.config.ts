import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'path';
import os from 'os';

// Load environment variables from .env file
config({ path: path.join(__dirname, '.env') });

// Use SQLite database in user's home directory
const dbPath = path.join(os.homedir(), '.commonbase-electron', 'database.db');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
});