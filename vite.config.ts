import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PhosphorIconsVueSplit",
    },
    rollupOptions: {
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
