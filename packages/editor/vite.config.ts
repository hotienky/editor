import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const underVitest = process.env.VITEST !== undefined;

export default defineConfig(({ mode }) => {
  const lib = mode === "lib";
  return {
    base: lib ? "./" : "/",
    resolve: {
      alias: {
        "@kindy/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
      },
    },
    build: lib
      ? {
          target: "es2022",
          outDir: "dist-lib",
          emptyOutDir: true,
          lib: {
            entry: {
              "kindy-editor": fileURLToPath(new URL("src/kindy-editor.ts", import.meta.url)),
              builder: fileURLToPath(new URL("src/builder/index.ts", import.meta.url)),
              import: fileURLToPath(new URL("src/import/docx/pipeline.ts", import.meta.url)),
              export: fileURLToPath(new URL("src/export/pipeline.ts", import.meta.url)),
              events: fileURLToPath(new URL("src/events/index.ts", import.meta.url)),
              measure: fileURLToPath(new URL("src/export/shared/measureHost.ts", import.meta.url)),
              "recalc-docx": fileURLToPath(new URL("src/recalc/patchTocDocx.ts", import.meta.url)),
              "generate-toc": fileURLToPath(new URL("src/recalc/generateTocDocx.ts", import.meta.url)),
            },
            formats: ["es"],
          },
        }
      : {
          target: "es2022",
        },
    plugins: underVitest
      ? []
      : [nodePolyfills({ include: ["buffer", "stream", "zlib", "util", "assert", "events", "process"] })],
    worker: { format: "es" },
  };
});
