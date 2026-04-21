import { PortalShell } from "@/components/portal/PortalShell";
import { FolderOpen } from "lucide-react";

export default function Files() {
  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Files</div>
        <h1 className="mt-2 text-3xl text-foreground">All Files</h1>
      </div>
      <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
        <div className="text-sm text-foreground">File library</div>
        <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
          Files attached to resources appear here. Upload via Tools & Worksheets, or attach
          external links per customer.
        </p>
      </div>
    </PortalShell>
  );
}