import { defineConfig } from "vite";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
