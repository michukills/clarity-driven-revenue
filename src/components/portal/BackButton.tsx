import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * P13.Platform.H — Universal navigation safety.
 * Renders a small "Back" control in authenticated layouts. Uses browser
 * history when available (preserves query params + scroll automatically),
 * otherwise falls back to a sensible parent route based on the current path.
 * Hidden on top-level landings (/admin, /portal) where a Back button would
 * either be redundant or send the user out of the authenticated surface.
 */

function resolveFallback(pathname: string): string | null {
  // Top-level — no Back needed
  if (pathname === "/admin" || pathname === "/admin/") return null;
  if (pathname === "/portal" || pathname === "/portal/") return null;

  // Customer detail → customer board
  if (/^\/admin\/customers\/[^/]+/.test(pathname)) return "/admin/customers";
  if (/^\/admin\/clients\/[^/]+/.test(pathname)) return "/admin/customers";

  // Diagnostic / Implementation workspace subroutes (defensive — workspaces
  // are mostly single pages today, but we keep the rule documented).
  if (pathname.startsWith("/admin/diagnostic-workspace/")) return "/admin/diagnostic-workspace";
  if (pathname.startsWith("/admin/implementation-workspace/")) return "/admin/implementation-workspace";

  // Admin tool runners → tools/distribution
  if (pathname.startsWith("/admin/tools/")) return "/admin/tools";
  if (pathname.startsWith("/admin/reports/")) return "/admin/reports";
  if (pathname.startsWith("/admin/rgs-business-control-center/")) return "/admin/rgs-business-control-center";

  // Generic admin → /admin
  if (pathname.startsWith("/admin/")) return "/admin";

  // Client portal data input cluster
  if (
    pathname.startsWith("/portal/connected-sources") ||
    pathname.startsWith("/portal/imports") ||
    pathname.startsWith("/portal/uploads")
  ) {
    return "/portal/provide-data";
  }
  if (pathname.startsWith("/portal/tools/")) return "/portal/tools";
  if (pathname.startsWith("/portal/reports/")) return "/portal/reports";
  if (pathname.startsWith("/portal/business-control-center/")) return "/portal/business-control-center";

  // Generic portal → /portal
  if (pathname.startsWith("/portal/")) return "/portal";

  return null;
}

export function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const fallback = resolveFallback(location.pathname);
  if (!fallback) return null;

  const handle = () => {
    // Prefer real browser history when this isn't the first entry — this
    // preserves query params (?gear=2), drawer-as-route state, and scroll.
    const state = (window.history.state ?? {}) as { idx?: number };
    const hasHistory = typeof state.idx === "number" ? state.idx > 0 : window.history.length > 1;
    if (hasHistory) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Go back to previous page"
      title="Back"
      className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back</span>
    </button>
  );
}

export default BackButton;
