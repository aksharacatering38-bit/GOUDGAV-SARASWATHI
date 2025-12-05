import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Using (process as any).cwd() to avoid TS error because @types/node might be missing or incomplete in this context
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This maps process.env.API_KEY in your code to the actual environment variable
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})