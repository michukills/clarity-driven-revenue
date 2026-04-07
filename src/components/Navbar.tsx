import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { label: "What We Do", path: "/#what-we-do" },
  { label: "System", path: "/#system" },
  { label: "Diagnostic", path: "/#diagnostic" },
  { label: "Business MRI", path: "/business-mri" },
  { label: "How RGS Works", path: "/how-rgs-works" },
];

const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = (path: string) => {
    setOpen(false);
    if (path.startsWith("/#")) {
      const id = path.slice(2);
      if (location.pathname === "/") {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = path;
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link
          to="/"
          className="font-display text-base font-semibold tracking-tight text-foreground"
        >
          Revenue &amp; Growth Systems
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isAnchor = link.path.startsWith("/#");
            if (isAnchor) {
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </button>
              );
            }
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={mailtoLink}
            className="btn-primary text-xs px-4 py-2 gap-1.5"
          >
            Request a Diagnostic
            <ArrowRight size={13} />
          </a>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-t border-border px-6 py-4 space-y-3">
          {navLinks.map((link) => {
            const isAnchor = link.path.startsWith("/#");
            if (isAnchor) {
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className="block text-sm font-medium text-muted-foreground"
                >
                  {link.label}
                </button>
              );
            }
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`block text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={mailtoLink}
            onClick={() => setOpen(false)}
            className="block btn-primary text-center"
          >
            Request a Diagnostic
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
