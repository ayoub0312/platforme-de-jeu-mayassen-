import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/index.tsx'),
      name: 'ObookingWidget',
      fileName: () => 'widget.bundle.js',
      formats: ['iife'], // Compile to self-executing bundle suitable for script tags
    },
    outDir: 'public', // Output directly to public/ folder of Next.js to serve statically
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      // We bundle react, react-dom, and queries to keep the widget fully self-contained
      external: [],
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
