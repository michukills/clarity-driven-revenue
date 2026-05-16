import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/RoleBadge";

const navLinks = [
  { label: "What We Do", path: "/what-we-do" },
  { label: "Scan", path: "/scan" },
  { label: "Insights", path: "/why-businesses-lose-revenue" },
  { label: "System", path: "/system" },
  { label: "Diagnostic", path: "/diagnostic" },
  { label: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, effectiveRole, signOut } = useAuth();

  const dashboardPath = isAdmin ? "/admin" : "/portal";
  const dashboardLabel = isAdmin ? "Admin" : "Portal";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link
          to="/"
          className="font-display text-base font-semibold tracking-tight text-foreground hover:text-primary transition-colors duration-300 flex items-center gap-2.5"
        >
          Revenue &amp; Growth Systems
          {user && <RoleBadge />}
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-[13px] font-medium transition-colors duration-300 relative ${
                location.pathname === link.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {location.pathname === link.path && (
                <span className="absolute -bottom-[21px] left-0 right-0 h-px bg-primary" />
              )}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath}
                className="btn-primary text-xs px-5 py-2.5 gap-1.5 inline-flex items-center"
              >
                <LayoutDashboard size={13} />
                {dashboardLabel}
              </Link>
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn-primary text-xs px-5 py-2.5 gap-1.5">
              Log In
              <ArrowRight size={13} />
            </Link>
          )}
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
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/40 px-6 py-5 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`block text-sm font-medium transition-colors duration-300 ${
                location.pathname === link.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)} className="block btn-primary text-center mt-2">
                Go to {dashboardLabel}
              </Link>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="block btn-primary text-center mt-2">
              Log In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
