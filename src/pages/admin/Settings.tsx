import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user, role } = useAuth();
  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Settings</div>
        <h1 className="mt-2 text-3xl text-foreground">Workspace</h1>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-3">
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={role} />
        <Row label="User ID" value={user?.id} mono />
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        To grant another user admin access, add a row to <code>user_roles</code> with their
        user_id and role = "admin" via Cloud → Database.
      </p>
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