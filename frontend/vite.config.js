import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
import { join } from 'path';
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    fs: {
      allow: [
        '.',
        '..',
        join(__dirname, '../../../../../'), // Allow the workspace root
        join(__dirname, 'node_modules'),
      ],
    },
  },
})
