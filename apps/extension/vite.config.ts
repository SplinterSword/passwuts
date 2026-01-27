import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { copyFileSync } from "fs"

const isFirefox = process.env.BROWSER === "firefox"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  console.log("VITE MODE:", mode)
  console.log("VITE_APP_URL:", env.VITE_APP_URL)

  return {
    define: {
      __APP_URL__: JSON.stringify(env.VITE_APP_URL),
    },

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
        },
      },
    ],

    publicDir: false,

    resolve: {
      alias: {
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
          entryFileNames: "[name]/index.js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  }
})
