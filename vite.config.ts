import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, ['VITE_']);
  const apiProxyTarget = (env.VITE_API_PROXY || '').trim();

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      ...(apiProxyTarget
        ? {
            proxy: {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
  };
});
