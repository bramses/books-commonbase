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
        'sqlite3',
        // Include all node built-ins
        ...builtinModules.map(module => `node:${module}`),
        ...builtinModules
      ]
    }
  }
});
