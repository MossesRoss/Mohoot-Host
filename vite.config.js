import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Changed as per our webhost, Vercel
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [react()],
    base: '/Mohoot-Host/', 
  }
})
