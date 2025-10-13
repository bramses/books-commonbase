import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Commonbase, Embedding } from './entities';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with proper path handling for Electron
try {
  // In development, look for .env in project root
  // In production, environment variables should be set via the main process
  if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
  }
} catch (error) {
  console.warn('Could not load .env file:', error.message);
}

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/commonbase-electron';

let dataSourceInstance: DataSource | null = null;

export const getDataSource = () => {
  if (!dataSourceInstance) {
    dataSourceInstance = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [Commonbase, Embedding],
      synchronize: true, // Auto-create/update tables in development
      logging: process.env.NODE_ENV === 'development',
      // Enable pgvector extension
      extra: {
        supportBigNumbers: true,
        bigNumberStrings: true,
      }
    });
  }
  return dataSourceInstance;
};

// Initialize the data source
let isInitialized = false;

export const initializeDatabase = async () => {
  if (isInitialized) return getDataSource();

  try {
    const dataSource = getDataSource();

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('Database connection established successfully');
    }

    isInitialized = true;
    return dataSource;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Export for backward compatibility
export const db = new Proxy({}, {
  get(_target, prop) {
    const dataSource = getDataSource();
    if (prop in dataSource) {
      return dataSource[prop];
    }
    // Return repository for entities
    if (prop === 'commonbase') {
      return dataSource.getRepository(Commonbase);
    }
    if (prop === 'embeddings') {
      return dataSource.getRepository(Embedding);
    }
    return undefined;
  }
});