import { defineConfig } from "vitest/config";
import path from "path";

const disableNativePlugins = process.env.RGS_DISABLE_NATIVE_PLUGINS === "1";
const react = disableNativePlugins
  ? null
  : (await import("@vitejs/plugin-react-swc")).default;

export default defineConfig({
  plugins: [react && react()].filter(Boolean),
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
