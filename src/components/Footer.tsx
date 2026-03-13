import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-display text-lg font-semibold mb-3 text-foreground">
              Revenue &amp; Growth Systems
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Operational discipline for service businesses.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">Pages</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link to="/business-mri" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Business MRI</Link>
              <Link to="/stability-framework" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Stability Framework</Link>
              <Link to="/how-rgs-works" className="block text-sm text-muted-foreground hover:text-primary transition-colors">How RGS Works</Link>
              <Link to="/why-rgs-exists" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Why RGS Exists</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wider">Connect</h4>
            <div className="space-y-2">
              <Link to="/contact" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            </div>
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
