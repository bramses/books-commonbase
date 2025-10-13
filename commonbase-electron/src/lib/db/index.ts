import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Export schema types for use in other files
export interface CommonbaseMetadata {
  title?: string;
  author?: string;
  source?: string;
  type?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  links?: string[];
  backlinks?: string[];
  [key: string]: any;
}

export interface Commonbase {
  id: string;
  data: string;
  metadata: CommonbaseMetadata;
  created: string;
  updated: string;
}

// Database path in user's home directory
const dbDir = path.join(os.homedir(), '.commonbase-electron');
const dbPath = path.join(dbDir, 'database.db');

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Lazy-loaded database connection
let sqlite: sqlite3.Database | null = null;
let db: any = null;
let isInitializing = false;

// Create mock database implementation
const createMockDatabase = () => {
  console.log('Using mock database - no data persistence');
  return {
    insert: () => ({
      values: () => ({
        returning: () => [{
          id: 'mock-id-' + Date.now(),
          data: 'mock data',
          metadata: {},
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }]
      })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [],
          innerJoin: () => ({ where: () => [] })
        }),
        orderBy: () => ({ limit: () => ({ offset: () => [] }) }),
        limit: () => []
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => [{
            id: 'mock-updated-id',
            data: 'updated mock data',
            metadata: {},
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }]
        })
      })
    }),
    delete: () => ({
      where: () => ({ changes: 1 })
    }),
  };
};

// Initialize SQLite with timeout to prevent hanging
const initializeSQLite = async (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SQLite initialization timeout - falling back to mock database'));
    }, 5000); // 5 second timeout

    console.log('Attempting SQLite initialization...');

    // Create the database connection (async)
    sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        clearTimeout(timeout);
        reject(err);
        return;
      }

      // Create tables
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS commonbase (
          id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
          data TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          created TEXT DEFAULT CURRENT_TIMESTAMP,
          updated TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS embeddings (
          id TEXT PRIMARY KEY REFERENCES commonbase(id) ON DELETE CASCADE,
          embedding TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_commonbase_created ON commonbase(created);
        CREATE INDEX IF NOT EXISTS idx_commonbase_data ON commonbase(data);
      `;

      sqlite!.exec(createTablesSQL, (execErr) => {
        if (execErr) {
          clearTimeout(timeout);
          reject(execErr);
          return;
        }

        // Enable WAL mode
        sqlite!.run('PRAGMA journal_mode = WAL', (walErr) => {
          if (walErr) {
            console.warn('Could not enable WAL mode:', walErr.message);
            // Continue anyway - WAL is not critical
          }

          console.log('✅ SQLite database initialized successfully');
          clearTimeout(timeout);
          resolve(sqlite);
        });
      });
    });
  });
};

// Get database connection with real SQLite
export const getDb = () => {
  if (!db && !isInitializing) {
    isInitializing = true;

    // Try SQLite initialization with timeout, fall back to mock if it fails
    initializeSQLite()
      .then((sqliteDb) => {
        db = sqliteDb;
        isInitializing = false;
      })
      .catch((error) => {
        console.error('❌ SQLite initialization failed:', error.message);
        console.log('📝 Falling back to mock database (no persistence)');

        db = createMockDatabase();
        isInitializing = false;
      });

    // For synchronous access, return mock database while initializing
    if (!db) {
      console.log('⏳ Database initializing, returning temporary mock...');
      return createMockDatabase();
    }
  }

  return db || createMockDatabase();
};

// Initialize database - now just calls getDb to ensure lazy loading
export const initializeDatabase = async () => {
  if (!db && !isInitializing) {
    getDb();
  }
};

// Utility function to check if database exists
export const databaseExists = () => fs.existsSync(dbPath);

// Export schema for use in queries
export * from './schema';