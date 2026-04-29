import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceRequestPanel } from "@/components/portal/ServiceRequestPanel";

export default function Account() {
  const { user } = useAuth();
  return (
    <PortalShell variant="customer">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</div>
        <h1 className="mt-2 text-3xl text-foreground">Your Profile</h1>
      </div>
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-3">
          <Row label="Email" value={user?.email} />
          <Row label="Account ID" value={user?.id} mono />
        </div>
        <ServiceRequestPanel />
      </div>
    </PortalShell>
  );
}

const Row = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
    <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>
      {value || "—"}
    </div>
  </div>
);