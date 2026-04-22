import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow } from "@/components/domains/DomainShell";
import { AUTOMATION_RULES, automationByDomain } from "@/lib/automation";

export default function OperationsSOPDomain() {
  const grouped = automationByDomain();
  const wired = AUTOMATION_RULES.filter((r) => r.status === "wired").length;
  const placeholder = AUTOMATION_RULES.length - wired;

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Operations / SOP System"
        description="Internal operating procedures, task workflows, document templates, and the centralized automation logic that ties the OS together."
      >
        <DomainSection
          title="SOP Workspaces"
          subtitle="Existing operations surfaces"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <LinkRow to="/admin/tasks" label="Tasks" hint="Active operational tasks across clients" />
            <LinkRow to="/admin/templates" label="Templates" hint="Reusable documents and outreach assets" />
            <LinkRow to="/admin/files" label="Files" hint="Internal + client file storage" />
          </div>
        </DomainSection>

        <DomainSection
          title="Automation Logic Map"
          subtitle={`${wired} wired · ${placeholder} planned · single source of truth in src/lib/automation.ts`}
        >
          <div className="space-y-5">
            {[...grouped.entries()].map(([domain, rules]) => (
              <div key={domain}>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{domain}</div>
                <div className="space-y-2">
                  {rules.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-md bg-muted/30 border border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">
                            <span className="text-muted-foreground">When </span>
                            {r.trigger}
                          </div>
                          <div className="text-sm text-foreground mt-1">
                            <span className="text-muted-foreground">Then </span>
                            {r.action}
                          </div>
                          {r.notes && (
                            <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{r.notes}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span
                            className={
                              r.status === "wired"
                                ? "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary"
                                : "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground"
                            }
                          >
                            {r.status}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {r.layer}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}