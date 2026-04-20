import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin";
import { tanstackStart } from "@tanstack/react-start/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackRouter(),
    tanstackStart(),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
});
