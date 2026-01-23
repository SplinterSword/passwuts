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

  // Disable Vite's public dir (we manage assets manually)
  publicDir: false,

  resolve: {
    alias: {
      // 🔑 IMPORTANT: Resolve workspace crypto package to built output
      "@pm/crypto": resolve(
        __dirname,
        "../../packages/crypto/dist"
      ),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",

    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },

      output: {
        entryFileNames: "[name]/index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
})
