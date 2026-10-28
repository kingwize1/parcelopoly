import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps the site working on github.io/<repo>/ and on a custom domain later.
export default defineConfig({ base: './', plugins: [react()] })
