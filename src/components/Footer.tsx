import { Link } from "react-router-dom";
import EmailSubscribeForm from "./EmailSubscribeForm";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 className="font-display text-lg font-semibold mb-3 text-foreground">
              Revenue &amp; Growth Systems
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clarity. Control. Predictable Revenue.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">Services</h4>
            <div className="space-y-2">
              <Link to="/services/market-position-pricing" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Market Position &amp; Pricing
              </Link>
              <Link to="/services/lead-sales-system" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Lead &amp; Sales System
              </Link>
              <Link to="/services/revenue-tracking-forecasting" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Revenue Tracking &amp; Forecasting
              </Link>
              <Link to="/services/operational-discipline" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Operational Discipline
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">Company</h4>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-primary transition-colors">About</Link>
              <Link to="/revenue-scorecard" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Revenue Scorecard</Link>
              <Link to="/insights" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Insights</Link>
              <Link to="/contact" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">Stay Informed</h4>
            <EmailSubscribeForm variant="inline" />
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Revenue &amp; Growth Systems LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
