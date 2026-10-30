import { defineConfig } from "vite";
export default defineConfig({
  base: "./",                                   // относительные пути: сборку можно положить в любую папку/подпуть сайта
  worker: { format: "es" },                     // воркер как ES-модуль (import replicad внутри)
  optimizeDeps: { exclude: ["replicad-opencascadejs"] },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
