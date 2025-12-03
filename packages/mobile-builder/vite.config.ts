import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const CDN_URL = "https://cdn-tos-cn.bytedance.net/obj/archi/caravel-lynx-demo/"

  return {
    plugins: [react()],

    // Base public path - adjust for deployment
    // Use CDN_URL environment variable if available, otherwise fallback to relative path
    base: CDN_URL || './',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 3000,
      open: true,
      host: true
    },

    build: {
      outDir: '../../dist',
      // Generate sourcemaps for production debugging (set to false for smaller bundle)
      sourcemap: true,

      // Target modern browsers for better optimization
      target: 'es2015',

      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_debugger: true,
        },
      },

      // Chunk size warning limit (in KB)
      chunkSizeWarningLimit: 1000,

      // Rollup options for advanced bundling
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'vue-vendor': ['@vue/reactivity'],
            'mobx-vendor': ['mobx-vue-lite'],
          },

          // Asset file naming
          assetFileNames: (assetInfo) => {
            if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(assetInfo.name ?? '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name ?? '')) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return `assets/[name]-[hash][extname]`;
          },

          // Chunk file naming
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },

      // Asset inline limit (in bytes) - files smaller than this will be inlined as base64
      assetsInlineLimit: 4096,

      // CSS code splitting
      cssCodeSplit: true,

      // Report compressed size (can be disabled for faster builds)
      reportCompressedSize: true,

      // Clean output directory before build
      emptyOutDir: true,
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@vue/reactivity', 'mobx-vue-lite'],
    },
  };
});
