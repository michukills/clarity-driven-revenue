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

export function launchToolTarget(target: ToolLaunchTarget, navigate: NavigateFunction) {
  if (target.kind === "internal") {
    navigate(target.href);
    return;
  }

  if (target.kind === "external") {
    window.open(target.href, "_blank", "noopener,noreferrer");
  }
}