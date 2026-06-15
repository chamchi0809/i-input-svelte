import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Dev-only config for the local playground in `src/demo`.
export default defineConfig({
  plugins: [svelte()],
});
