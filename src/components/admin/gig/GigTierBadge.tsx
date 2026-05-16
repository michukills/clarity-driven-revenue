import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GIG_TIER_LABEL, GIG_TIER_TONE, type GigTier } from "@/lib/gig/gigTier";

export function GigTierBadge({ tier, className }: { tier: GigTier | null | undefined; className?: string }) {
  if (!tier) {
    return (
      <Badge variant="outline" className={cn("border-dashed text-muted-foreground", className)}>
        Tier not set
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border", GIG_TIER_TONE[tier], className)}>
      {GIG_TIER_LABEL[tier]}
    </Badge>
  );
}

export function GigAccountBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border border-accent/40 bg-accent/10 text-accent-foreground", className)}>
      Gig Customer
    </Badge>
  );
}
