import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SCORECARD_CTA_LABEL, SCORECARD_PATH } from "@/lib/cta";

/**
 * Persistent bottom CTA. Visible on all viewports but kept subtle
 * so it doesn't compete with on-page content.
 */
const StickyCTA = () => {
  const { pathname } = useLocation();
  const suppress =
    pathname === "/scorecard" ||
    pathname.startsWith("/scorecard/") ||
    pathname === "/start" ||
    pathname.startsWith("/start/");

  if (suppress) return null;

  return (
    // PublicLegalFooter.H.1 — z-30 sits BELOW the legal row (z-50) so it
    // can never cover Terms/Privacy. On mobile the pill is constrained to
    // the right side so it doesn't span the full width over footer links.
    <div
      className="fixed bottom-4 right-4 left-auto z-30 pointer-events-none"
      aria-hidden={false}
    >
      <div className="max-w-[16rem] sm:max-w-xs ml-auto">
        <Link
          to={SCORECARD_PATH}
          className="pointer-events-auto group flex items-center justify-center gap-2 w-full bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-[0_8px_28px_-6px_hsl(78_36%_35%/0.55)] backdrop-blur-md transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_hsl(78_36%_35%/0.65)] active:translate-y-0"
        >
          {SCORECARD_CTA_LABEL}
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
};

export default StickyCTA;
