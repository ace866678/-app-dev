import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap:
      process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      maxParallelFileOps: 128,
      output: {
        // Split heavy third-party libraries so they cache independently and the
        // first page (sign-in) downloads less script.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('emoji-picker-react')) return 'vendor-emoji';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
