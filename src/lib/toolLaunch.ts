import type { NavigateFunction } from "react-router-dom";

export type ToolLaunchTarget =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "none" };

const GOOGLE_DOC_PATTERNS = [
  /docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/i,
  /docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/i,
  /docs\.google\.com\/presentation\/d\/[a-zA-Z0-9-_]+/i,
  /drive\.google\.com\/file\/d\/[a-zA-Z0-9-_]+/i,
];

/**
 * Maps a normalized tool title to its built-in route.
 * Admin context = /admin/tools/* runners; client/portal context = /portal/tools/* runners.
 * Resources rows for built-in RGS tools have no `url`, so we resolve them by title.
 */
const ADMIN_TITLE_ROUTES: Record<string, string> = {
  "rgs stability scorecard": "/admin/tools/stability-scorecard",
  "stability scorecard": "/admin/tools/stability-scorecard",
  "revenue leak detection": "/admin/tools/revenue-leak-finder",
  "revenue leak detection system": "/admin/tools/revenue-leak-finder",
  "revenue leak finder": "/admin/tools/revenue-leak-finder",
  "buyer persona tool": "/admin/tools/persona-builder",
  "buyer persona": "/admin/tools/persona-builder",
  "customer journey mapper": "/admin/tools/journey-mapper",
  "customer journey": "/admin/tools/journey-mapper",
  "process breakdown tool": "/admin/tools/process-breakdown",
  "process breakdown": "/admin/tools/process-breakdown",
  // P4.3 canonical: admin Revenue Tracker lives in the RGS internal BCC.
  "revenue tracker": "/admin/rgs-business-control-center/revenue-tracker",
};

const CLIENT_TITLE_ROUTES: Record<string, string> = {
  "rgs stability scorecard": "/portal/scorecard",
  "stability scorecard": "/portal/scorecard",
  "client self-assessment": "/portal/tools/self-assessment",
  "self-assessment": "/portal/tools/self-assessment",
  "stability self-assessment": "/portal/tools/self-assessment",
  "implementation tracker": "/portal/tools/implementation-tracker",
  "weekly reflection": "/portal/tools/weekly-reflection",
  "revenue risk monitor": "/portal/tools/revenue-risk-monitor",
  "revenue & risk monitor": "/portal/tools/revenue-risk-monitor",
  "revenue leak engine": "/portal/tools/revenue-leak-engine",
  "revenue leak detection": "/portal/tools/revenue-leak-engine",
  "revenue leak detection system": "/portal/tools/revenue-leak-engine",
  "revenue leak finder": "/portal/tools/revenue-leak-engine",
  "revenue tracker (client)": "/portal/business-control-center/revenue-tracker",
  "revenue tracker - client": "/portal/business-control-center/revenue-tracker",
  "onboarding worksheet": "/portal/uploads",
};

function normalizeTitle(title: string | null | undefined): string {
  return (title || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Resolve a built-in route for a tool by title, scoped to "admin" or "client".
 * Returns null if no built-in mapping exists.
 */
export function resolveBuiltInRoute(
  title: string | null | undefined,
  context: "admin" | "client",
): string | null {
  const key = normalizeTitle(title);
  if (!key) return null;
  const map = context === "admin" ? ADMIN_TITLE_ROUTES : CLIENT_TITLE_ROUTES;
  return map[key] || null;
}

export function classifyToolUrl(url: string | null | undefined): ToolLaunchTarget {
  if (!url) return { kind: "none" };

  const trimmed = url.trim();
  if (!trimmed) return { kind: "none" };
  if (trimmed.startsWith("/")) return { kind: "internal", href: trimmed };

  const lower = trimmed.toLowerCase();
  if (lower.includes("placeholder")) return { kind: "none" };
  if (!/^https?:\/\//i.test(trimmed)) return { kind: "none" };

  const isGoogleDoc = /docs\.google\.com|drive\.google\.com/i.test(trimmed);
  if (isGoogleDoc && !GOOGLE_DOC_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { kind: "none" };
  }

  return { kind: "external", href: trimmed };
}

/**
 * Convenience: classify a tool by checking its URL first, then falling back
 * to a built-in route mapping based on its title.
 */
export function classifyTool(
  tool: { title?: string | null; url?: string | null },
  context: "admin" | "client",
): ToolLaunchTarget {
  const fromUrl = classifyToolUrl(tool.url);
  if (fromUrl.kind !== "none") return fromUrl;
  const builtIn = resolveBuiltInRoute(tool.title, context);
  if (builtIn) return { kind: "internal", href: builtIn };
  return { kind: "none" };
}

export function launchToolTarget(target: ToolLaunchTarget, navigate: NavigateFunction) {
  if (target.kind === "internal") {
    navigate(target.href);
    return;
  }

  if (target.kind === "external") {
    window.open(target.href, "_blank", "noopener,noreferrer");
  }
}