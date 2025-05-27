import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Content-Security-Policy": `
        default-src 'self'; 
        script-src 'self' 'unsafe-eval'; 
        style-src 'self' 'unsafe-inline'; 
        connect-src 'self' http://localhost:3000;
      `.replace(/\s+/g, ' ')
    }
  }
})
