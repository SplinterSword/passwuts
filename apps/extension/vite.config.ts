import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { copyFileSync } from "fs"

const isFirefox = process.env.BROWSER === "firefox"

export default defineConfig({
  plugins: [
    react(),
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
      }
    }
  ],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts")
      },
      output: {
        entryFileNames: "[name]/index.js"
      }
    }
  }
})
