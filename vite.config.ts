import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['sowa-icon.svg'],
        manifest: {
          name: 'Sowa AI Assistant',
          short_name: 'Sowa AI',
          description: 'Your Autonomous Neural AI Live Companion and Desktop Controller',
          theme_color: '#050507',
          background_color: '#050507',
          display: 'standalone',
          icons: [
            {
              src: 'sowa-icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/release/**', '**/dist-electron/**', '**/.git/**']
      },
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.PORT || 3000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
