import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        'fsevents',
        // Only externalize actual native binary modules that can't be bundled
        'better-sqlite3',
        'sqlite3',
        'pg',
        'pg-native',
        // TypeORM optional dependencies - explicit list with common submodules
        '@google-cloud/spanner',
        '@google-cloud/spanner/build/src/transaction',
        '@sap/hana-client',
        '@sap/hana-client/extension/Stream',
        'mongodb',
        'mongodb/lib/gridfs-bucket',
        'mssql',
        'mssql/lib/base',
        'mssql/lib/datatypes',
        'mysql2',
        'mysql2/promise',
        'oracledb',
        'oracledb/lib/oracledb',
        'pg-query-stream',
        'redis',
        'redis/lib/commands',
        'ioredis',
        'sql.js',
        'ts-node',
        'typeorm-aurora-data-api-driver',
        // Include all node built-ins
        ...builtinModules.map(module => `node:${module}`),
        ...builtinModules
      ]
    }
  }
});
