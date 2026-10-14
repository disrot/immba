import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** Copy the images tree Vite would otherwise skip (JS string URLs are not in the module graph). */
const copyStaticImages = () => ({
  name: "copy-static-images",
  writeBundle() {
    const from = resolve("images");
    const to = resolve("dist/images");
    if (!existsSync(from)) return;
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
  },
});

const htmlInput = (dir, acc = {}) => {
  for (const name of readdirSync(dir)) {
    if (name === "dist" || name === "node_modules" || name === ".tools" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) htmlInput(path, acc);
    else if (name.endsWith(".html")) {
      const key = path.replace(/^\.\//, "").replace(/\.html$/, "").replace(/[\\/]/g, "-");
      acc[key] = resolve(path);
    }
  }
  return acc;
};

export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [copyStaticImages()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    emptyOutDir: true,
    minify: "esbuild",
    rollupOptions: {
      input: htmlInput("."),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
