# TypeORM Optional Dependencies Import Error in Electron Build

## Issue Type
- [x] Bug report
- [ ] Feature request
- [ ] Question

## TypeORM Version
`0.3.27`

## Database System
PostgreSQL with pgvector extension

## Electron Framework
Electron 38.2.2 with Electron Forge and Vite

## Operating System
macOS (Darwin 23.5.0)

## Problem Description
TypeORM attempts to import optional dependencies like `@google-cloud/spanner` during runtime in packaged Electron applications, even when these dependencies are not installed and not being used. This causes the application to crash on startup with module resolution errors.

## Expected Behavior
TypeORM should gracefully handle missing optional dependencies in bundled environments like Electron apps, where unused optional dependencies are typically not included in the final package.

## Actual Behavior
The application crashes with the following error:
```
Uncaught Exception: Error: Could not resolve "@google-cloud/spanner" imported by "typeorm". Is it installed?
```

## Error Stack Trace
```
Error: Could not resolve "@google-cloud/spanner" imported by "typeorm". Is it installed?
    at packageEntryFailure (/path/to/app/node_modules/.vite/deps/typeorm.js:1:234)
    at resolvePackageEntry (/path/to/app/node_modules/.vite/deps/typeorm.js:1:567)
    at resolvePackageData (/path/to/app/node_modules/.vite/deps/typeorm.js:1:890)
```

## Reproduction Steps
1. Create an Electron application with TypeORM
2. Configure TypeORM with PostgreSQL (not Google Cloud Spanner)
3. Build the application using Electron Forge with Vite
4. Package the application with ASAR or similar bundling
5. Launch the packaged application

## Configuration Files

### package.json (dependencies)
```json
{
  "dependencies": {
    "typeorm": "^0.3.27",
    "pg": "^8.16.3",
    "pgvector": "^0.2.1",
    "reflect-metadata": "^0.2.2"
  }
}
```

### vite.main.config.ts (Electron build configuration)
```typescript
import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'sqlite3',
        'pg',
        'pg-native',
        // TypeORM optional dependencies - required to prevent import errors
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
        ...builtinModules.map(module => `node:${module}`),
        ...builtinModules
      ]
    }
  }
});
```

### TypeORM Configuration
```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [/* PostgreSQL entities */],
  synchronize: false,
  logging: false
});
```

## Current Workaround
Adding all TypeORM optional dependencies to the Vite external configuration prevents the import error, but this is not ideal as it requires knowing and maintaining a list of all optional dependencies.

## Environment Details
- **Node.js**: v18+
- **Electron**: 38.2.2
- **Electron Forge**: ^7.10.2
- **Vite**: ^5.4.20
- **Build Tool**: @electron-forge/plugin-vite
- **Target Database**: PostgreSQL only (no Google Cloud Spanner usage)

## Suggested Solution
TypeORM should use dynamic imports with try/catch blocks for optional dependencies, or provide a configuration option to disable specific optional dependency imports during build time.

## Additional Context
This issue specifically affects bundled environments like Electron where optional dependencies are not installed to reduce bundle size. The error occurs even when the optional dependency (Google Cloud Spanner) is not being used anywhere in the application code.

## Related Issues
- Similar issues may exist with other bundlers (Webpack, Parcel, etc.)
- Affects all TypeORM optional dependencies, not just Google Cloud Spanner