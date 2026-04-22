import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type Crumb = { label: string; to?: string };

export function DomainShell({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-2 text-3xl text-foreground font-light tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">{description}</p>
          )}
          {crumbs && crumbs.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  {c.to ? (
                    <Link to={c.to} className="hover:text-foreground transition-colors">
                      {c.label}
                    </Link>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <span className="text-muted-foreground/40">/</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function DomainSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm text-foreground font-medium">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PhaseTwoNote({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground">
      <span className="uppercase tracking-wider text-[10px] text-primary mr-2">Phase 2</span>
      {text}
    </div>
  );
}

export function LinkRow({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40 transition-colors"
    >
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-light text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}