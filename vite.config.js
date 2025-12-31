import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Changed as per our webhost, Vercel and GitHub Pages compatibility
export default defineConfig(({ command, mode }) => {
  const isVercel = process.env.VERCEL === '1';
  return {
    plugins: [react()],
    base: isVercel ? '/' : '/Mohoot-Host/', 
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
    },
  }
})
