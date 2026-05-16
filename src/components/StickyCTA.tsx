import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SCAN_PATH, SCORECARD_PATH } from "@/lib/cta";

/**
 * Persistent bottom CTA. Visible on all viewports but kept subtle
 * so it doesn't compete with on-page content.
 */
const StickyCTA = () => {
  const { pathname } = useLocation();
  const [pageCtaVisible, setPageCtaVisible] = useState(true);
  const suppress =
    pathname === "/scorecard" ||
    pathname.startsWith("/scorecard/") ||
    pathname === "/start" ||
    pathname.startsWith("/start/") ||
    pathname === "/scan" ||
    pathname.startsWith("/scan/");

  useEffect(() => {
    if (suppress || typeof window === "undefined") {
      setPageCtaVisible(false);
      return;
    }

    let raf: number | null = null;
    const scorecardPath = new URL(SCORECARD_PATH, window.location.origin).pathname;
    const scanPath = new URL(SCAN_PATH, window.location.origin).pathname;

    const isPrimaryPublicCta = (el: HTMLAnchorElement) => {
      if (el.closest("[data-rgs-sticky-cta]")) return false;
      try {
        const url = new URL(el.href, window.location.href);
        if (url.pathname !== scorecardPath && url.pathname !== scanPath) return false;
      } catch {
        return false;
      }
      // P96E — Sticky CTA is Scan-first. Old "0–1000 / business score /
      // stable your business" markers were tied to the retired public
      // Scorecard hero and have been removed.
      const text = el.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      return (
        text.includes("operational friction scan") ||
        text.includes("run the scan") ||
        text.includes("start the scan")
      );
    };

    const isVisible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight
      );
    };

    const check = () => {
      raf = null;
      const ctas = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
      setPageCtaVisible(ctas.some((el) => isPrimaryPublicCta(el) && isVisible(el)));
    };

    const schedule = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(check);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (raf !== null) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [pathname, suppress]);

  if (suppress || pageCtaVisible) return null;

  return (
    // PublicLegalFooter.H.1 — z-30 sits BELOW the legal row (z-50) so it
    // can never cover Terms/Privacy.
    // P95Y — Sit ABOVE the RgsGuideBot collapsed bar (which is fixed at
    // bottom-3 mobile / bottom-5 desktop, ~52px tall) so the chatbot
    // never obscures the primary CTA. Vertical stacking avoids the
    // earlier z-index collision instead of just bumping z-index.
    <div
      data-rgs-sticky-cta
      className="fixed bottom-[76px] right-4 left-auto z-30 pointer-events-none sm:bottom-[80px] sm:right-5"
      aria-hidden={false}
    >
      <div className="max-w-[16rem] sm:max-w-xs ml-auto">
        <Link
          to={SCAN_PATH}
          className="pointer-events-auto group flex items-center justify-center gap-2 w-full bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-[0_8px_28px_-6px_hsl(78_36%_35%/0.55)] backdrop-blur-md transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_hsl(78_36%_35%/0.65)] active:translate-y-0"
        >
          Run the Operational Friction Scan
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
