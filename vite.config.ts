import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy to MasterAPI backend so SameSite cookies work (same-origin from browser perspective)
        proxy: {
          '/auth':      { target: 'http://localhost:4000', changeOrigin: true },
          '/dashboard': { target: 'http://localhost:4000', changeOrigin: true },
          '/scan':      { target: 'http://localhost:4000', changeOrigin: true },
          '/user':      { target: 'http://localhost:4000', changeOrigin: true },
          '/diet':      { target: 'http://localhost:4000', changeOrigin: true },
          '/training':  { target: 'http://localhost:4000', changeOrigin: true },
          '/chat':          { target: 'http://localhost:4000', changeOrigin: true },
          '/notifications': { target: 'http://localhost:4000', changeOrigin: true },
          '/health':    { target: 'http://localhost:4000', changeOrigin: true },
        },
      },
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
