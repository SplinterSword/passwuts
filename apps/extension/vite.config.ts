import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { copyFileSync } from "fs"

const isFirefox = process.env.BROWSER === "firefox"

export default defineConfig({
  plugins: [
    react(),

    // Copy correct manifest after build
    {
      name: "copy-manifest",
      closeBundle() {
        const manifest = isFirefox
          ? "manifest.firefox.json"
          : "manifest.chrome.json"

        copyFileSync(
          resolve(__dirname, `public/${manifest}`),
          resolve(__dirname, "dist/manifest.json")
        )
      },
    },
  ],

  // We fully control outputs
  publicDir: false,

  resolve: {
    alias: {
      // Workspace crypto package → compiled output
      "@pm/crypto": resolve(__dirname, "../../packages/crypto/dist"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    
    target: "es2020",
    sourcemap: false,
    minify: true,

    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },

      output: {
        format: "es",

        // Keep predictable paths for manifest
        entryFileNames: "[name]/index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",

        // Prevent Rollup from wrapping in IIFE
        inlineDynamicImports: false,
      },
    },
  },
})
