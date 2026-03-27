import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { DEFAULT_GEMINI_MODEL_ID } from './constants';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, configDir, ['GEMINI_', 'VITE_']);
    const geminiKey = (
      env.GEMINI_API_KEY ||
      env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();

    const geminiModel = (
      env.GEMINI_MODEL ||
      env.VITE_GEMINI_MODEL ||
      process.env.GEMINI_MODEL ||
      process.env.VITE_GEMINI_MODEL ||
      DEFAULT_GEMINI_MODEL_ID
    ).trim() || DEFAULT_GEMINI_MODEL_ID;

    // JSON.stringify(undefined) 非法，空密钥用 ""
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_MODEL': JSON.stringify(geminiModel),
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});