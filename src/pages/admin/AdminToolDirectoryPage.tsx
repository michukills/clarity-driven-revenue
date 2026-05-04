import { PortalShell } from "@/components/portal/PortalShell";
import { AdminToolDirectoryPanel } from "@/components/admin/AdminToolDirectory";
import { LayoutGrid } from "lucide-react";

/**
 * RGS Tool Directory — dedicated admin route. Reuses the existing
 * AdminToolDirectory registry/panel; no duplicate metadata. Protected
 * via ProtectedRoute requireRole="admin" in App.tsx.
 */
export default function AdminToolDirectoryPage() {
  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <LayoutGrid className="h-3.5 w-3.5" />
            System
          </div>
          <h1 className="text-2xl font-light tracking-tight mt-2">RGS Tool Directory</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Every separated RGS tool, grouped by service lane. Customer-specific
            tools open from inside a client record so tenant isolation and
            access gates stay intact. Admin-only — never exposed to clients.
          </p>
        </header>
        <AdminToolDirectoryPanel variant="page" />
      </div>
    </PortalShell>
  );
}