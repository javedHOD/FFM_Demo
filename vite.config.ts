import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".ngrok-free.dev", // Is dot (.) ki wajah se saare ngrok links automatic allow ho jayenge
      ".ngrok.io"
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  appType: "spa",
});