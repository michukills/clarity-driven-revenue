import { Link } from "react-router-dom";
import { DIAGNOSTIC_MAILTO } from "@/lib/cta";

const mailtoLink = DIAGNOSTIC_MAILTO;

const footerLinks = [
  { label: "What We Do", path: "/what-we-do" },
  { label: "System", path: "/system" },
  { label: "Scorecard", path: "/scorecard" },
  { label: "Diagnostic", path: "/diagnostic" },
  { label: "Implementation", path: "/implementation" },
  { label: "Revenue Control System™", path: "/revenue-control-system" },
  { label: "Contact", path: "/contact" },
];

// P8.2 — Problem-led SEO hub + spokes. Surfaced from the footer
// (not the main nav) so it doesn't clutter the primary navigation
// while still giving search engines and curious visitors a clear path in.
const insightsLinks = [
  { label: "Why businesses lose revenue", path: "/why-businesses-lose-revenue" },
  { label: "Identify your ideal customer", path: "/identify-ideal-customer" },
  { label: "Track revenue & cash flow weekly", path: "/track-revenue-cash-flow-weekly" },
  { label: "Losing customers before they buy", path: "/losing-customers-before-they-buy" },
  { label: "Measure business stability", path: "/measure-business-stability" },
  { label: "Fix operational bottlenecks", path: "/fix-operational-bottlenecks" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/RevenuAndGrowthSystems/",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/revenueandgrowthsystems?igsh=bWznwnmzy2bzgyb3dj&utm_source=qr",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-10 md:gap-16">
          {/* Brand */}
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Revenue &amp; Growth Systems LLC
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Stable businesses run on systems, not guesswork.
            </p>
            <a
              href={mailtoLink}
              className="inline-block mt-4 text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              info@revenueandgrowthsystems.com
            </a>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
              Navigate
            </p>
            {footerLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">
              Follow
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 section-divider" />
        <p className="text-xs text-muted-foreground/60 mt-6 text-center italic">
          Built on structured systems, not guesswork.
        </p>
        <p className="text-xs text-muted-foreground/50 mt-3 text-center">
          © {new Date().getFullYear()} Revenue &amp; Growth Systems LLC. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
