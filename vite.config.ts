import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoBase =
  process.env.NODE_ENV === 'development'
    ? '/'
    : process.env.VITE_GITHUB_PAGES_BASE ?? '/';

export default defineConfig({
  base: repoBase,
  plugins: [react()],
});
