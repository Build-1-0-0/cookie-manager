import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteTailwind } from 'vite-plugin-tailwindcss';

export default defineConfig({
  plugins: [react(), viteTailwind()],
});
