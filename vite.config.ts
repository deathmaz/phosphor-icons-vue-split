import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

function mergeVueSfcChunks(): Plugin {
  return {
    name: "merge-vue-sfc-chunks",
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk" || !fileName.includes(".vue_vue_type_"))
          continue;
        const wrapperName = fileName.replace(/\.vue_vue_type_.*$/, ".mjs");
        const wrapper = bundle[wrapperName];
        if (wrapper?.type === "chunk") {
          wrapper.code = chunk.code;
          delete bundle[fileName];
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), mergeVueSfcChunks()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PhosphorIconsVueSplit",
    },
    rolldownOptions: {
      external: ["vue"],
      output: [
        {
          preserveModules: true,
          format: "esm",
          entryFileNames: "[name].mjs",
          globals: { vue: "Vue" },
        },
      ],
    },
  },
});
