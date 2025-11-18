import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoBase = process.env.VITE_GITHUB_PAGES_BASE ?? '/ai-doc-analysis/';

export default defineConfig({
  base: repoBase,
  plugins: [react()],
});
