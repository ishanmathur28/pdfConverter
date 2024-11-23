import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        // target: 'https://pdfconverter-c9xt.onrender.com',
        changeOrigin: true, // Ensures the host header is changed to match the target
        secure: false, // Disable SSL verification for localhost
      },
    },
  },
});
