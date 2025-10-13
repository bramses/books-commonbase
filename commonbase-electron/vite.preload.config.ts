import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        // Include all node built-ins
        ...builtinModules.map(module => `node:${module}`),
        ...builtinModules
      ]
    }
  }
});
