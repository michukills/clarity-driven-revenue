import { ArrowRight } from "lucide-react";
import { DIAGNOSTIC_MAILTO, DIAGNOSTIC_CTA_LABEL } from "@/lib/cta";

/**
 * Persistent bottom CTA. Visible on all viewports but kept subtle
 * so it doesn't compete with on-page content.
 */
const StickyCTA = () => {
  return (
    <div
      className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none"
      aria-hidden={false}
    >
      <div className="container mx-auto max-w-md md:max-w-sm md:ml-auto md:mr-6">
        <a
          href={DIAGNOSTIC_MAILTO}
          className="pointer-events-auto group flex items-center justify-center gap-2 w-full bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-[0_8px_28px_-6px_hsl(78_36%_35%/0.55)] backdrop-blur-md transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_hsl(78_36%_35%/0.65)] active:translate-y-0"
        >
          {DIAGNOSTIC_CTA_LABEL}
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-1"
          />
        </a>
      </div>
    </div>
  );
};

export default StickyCTA;
