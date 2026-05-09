import { defineConfig, type Plugin } from "vite";
import path from "path";
import { componentTagger } from "lovable-tagger";

const stripThirdPartyUseClientDirectives = (): Plugin => ({
  name: "rgs-strip-third-party-use-client-directives",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("node_modules")) return null;
    if (!code.startsWith("\"use client\"") && !code.startsWith("'use client'")) return null;

    return {
      code: code.replace(/^(['"])use client\1;?\s*/, ""),
      map: null,
    };
  },
});

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const disableNativePlugins = process.env.RGS_DISABLE_NATIVE_PLUGINS === "1";
  const react = disableNativePlugins
    ? null
    : (await import("@vitejs/plugin-react-swc")).default;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    // IP-H1: production builds must not ship source maps containing
    // proprietary RGS OS logic (registries, interpretation helpers,
    // report builders, prompt scaffolding). Dev builds keep maps for
    // debugging.
    build: {
      sourcemap: mode === "development",
      // After route-level splitting, the only chunk above Vite's generic
      // 500 kB line is the authenticated admin customer workbench. It ships
      // at a much smaller gzip size, so keep the warning threshold aligned
      // with the actual launch bundle profile instead of hiding broad bloat.
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const normalizedId = id.split(path.sep).join("/");

            if (normalizedId.includes("/node_modules/")) {
              if (
                normalizedId.includes("/react/") ||
                normalizedId.includes("/react-dom/") ||
                normalizedId.includes("/react-router-dom/")
              ) {
                return "vendor-react";
              }
              if (normalizedId.includes("@tanstack/react-query")) {
                return "vendor-query";
              }
              if (normalizedId.includes("framer-motion")) {
                return "vendor-motion";
              }
              if (normalizedId.includes("html2canvas")) {
                return "vendor-html2canvas";
              }
              if (normalizedId.includes("jspdf")) {
                return "vendor-pdf";
              }
              if (normalizedId.includes("dompurify")) {
                return "vendor-purify";
              }
              if (normalizedId.includes("lucide-react")) {
                return "vendor-icons";
              }
              if (
                normalizedId.includes("recharts") ||
                normalizedId.includes("d3-") ||
                normalizedId.includes("victory")
              ) {
                return "vendor-charts";
              }

              return undefined;
            }

            return undefined;
          },
        },
      },
    },
    plugins: [
      stripThirdPartyUseClientDirectives(),
      react && react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
