import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";

export default function PortalScorecard() {
  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Stability Score"
        title="Business Stability Index™"
        description="A 0–1000 view of where your business stands across five pillars: revenue leaks, conversion, operations, financial visibility, and owner dependency."
      >
        <DomainSection title="Take or Retake the Scorecard">
          <Link
            to="/scorecard"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary/15 text-primary text-sm hover:bg-primary/25 transition-colors"
          >
            Open Scorecard →
          </Link>
        </DomainSection>

        <DomainSection title="Your Pillar Breakdown" subtitle="Available after your scorecard is recorded by RGS">
          <div className="text-xs text-muted-foreground">No scored result on file yet.</div>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}