import { Lock, Eye, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { effectiveVisibility, type Visibility } from "@/lib/visibility";

type Size = "sm" | "md" | "lg";

interface Props {
  visibility: Visibility | string | null | undefined;
  override?: Visibility | string | null;
  size?: Size;
  showOverrideHint?: boolean;
  className?: string;
}

const STYLE: Record<Visibility, { label: string; cls: string; Icon: any }> = {
  internal: {
    label: "Internal Only",
    // Gray — neutral, locked
    cls: "bg-muted/60 text-muted-foreground border-muted-foreground/30",
    Icon: Lock,
  },
  customer: {
    label: "Client Visible",
    // Green — safe to share, read-only
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Icon: Eye,
  },
  client_editable: {
    // Accent — RGS primary
    label: "Client Editable",
    cls: "bg-primary/15 text-primary border-primary/40",
    Icon: Edit3,
  },
};

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1 [&_svg]:h-2.5 [&_svg]:w-2.5",
  md: "text-[11px] px-2 py-0.5 gap-1.5 [&_svg]:h-3 [&_svg]:w-3",
  lg: "text-xs px-2.5 py-1 gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5",
};

export function VisibilityBadge({
  visibility,
  override,
  size = "md",
  showOverrideHint = true,
  className,
}: Props) {
  const eff = effectiveVisibility(visibility ?? "internal", override) as Visibility;
  const style = STYLE[eff] ?? STYLE.internal;
  const Icon = style.Icon;
  const isOverridden = showOverrideHint && override && override !== visibility;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border whitespace-nowrap",
        SIZES[size],
        style.cls,
        className,
      )}
      title={isOverridden ? `Per-client override (tool default: ${visibility})` : style.label}
    >
      <Icon />
      {style.label}
      {isOverridden && <span className="opacity-70">·override</span>}
    </span>
  );
}

export default VisibilityBadge;
