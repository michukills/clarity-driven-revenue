import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, Search, ArrowUpRight, Lock, Users } from "lucide-react";

type Lane = "Diagnostic" | "Implementation" | "RGS Control System" | "Admin / System";
type Access = "admin-only" | "client-facing" | "admin + client review";

type ToolEntry = {
  name: string;
  purpose: string;
  lane: Lane;
  pillar?: string;
  access: Access;
  href?: string;
  customerScoped?: boolean;
  reportable?: boolean;
  notes?: string;
};

/**
 * Admin Tool Directory — premium scrollable menu of every separated RGS tool.
 * Only links to real, audited routes from src/App.tsx. Customer-scoped tools
 * are surfaced with a clear note instead of a global link, so admins reach them
 * through the proper customer record (preserving tenant + access boundaries).
 */
const TOOLS: ToolEntry[] = [
  // Diagnostic lane
  {
    name: "Diagnostic Workspace",
    purpose: "Central admin surface for reviewing intake, sources, imports, and diagnostic findings.",
    lane: "Diagnostic",
    access: "admin-only",
    href: "/admin/diagnostic-workspace",
  },
  {
    name: "Owner Diagnostic Interview",
    purpose: "Captures the owner's starting context before deeper diagnostic tools open.",
    lane: "Diagnostic",
    access: "admin + client review",
    href: "/admin/diagnostic-interviews",
    notes: "Open a specific interview from the list to review answers.",
  },
  {
    name: "Diagnostic Orders",
    purpose: "Tracks paid diagnostic orders awaiting intake or fulfillment.",
    lane: "Diagnostic",
    access: "admin-only",
    href: "/admin/diagnostic-orders",
  },
  {
    name: "Stability Scorecard",
    purpose: "0–1000 Business Stability Scorecard tool used during diagnostic.",
    lane: "Diagnostic",
    pillar: "Multi-pillar",
    access: "admin-only",
    href: "/admin/tools/stability-scorecard",
    reportable: true,
  },
  {
    name: "Scorecard Leads",
    purpose: "Public scorecard submissions awaiting qualification.",
    lane: "Diagnostic",
    access: "admin-only",
    href: "/admin/scorecard-leads",
  },
  {
    name: "Revenue Leak Finder",
    purpose: "Standalone diagnostic tool for surfacing revenue leakage signals.",
    lane: "Diagnostic",
    pillar: "Revenue Conversion",
    access: "admin-only",
    href: "/admin/tools/revenue-leak-finder",
  },
  {
    name: "Persona Builder",
    purpose: "Builds buyer/customer personas to anchor diagnostic and demand work.",
    lane: "Diagnostic",
    pillar: "Demand Generation",
    access: "admin-only",
    href: "/admin/tools/persona-builder",
  },
  {
    name: "Journey Mapper",
    purpose: "Maps the customer journey across acquisition, conversion, and retention.",
    lane: "Diagnostic",
    pillar: "Revenue Conversion",
    access: "admin-only",
    href: "/admin/tools/journey-mapper",
  },
  {
    name: "Process Breakdown",
    purpose: "Breaks an operational process into steps to surface friction points.",
    lane: "Diagnostic",
    pillar: "Operational Efficiency",
    access: "admin-only",
    href: "/admin/tools/process-breakdown",
  },
  {
    name: "SWOT Analysis",
    purpose: "Structured SWOT review tied to a specific client engagement.",
    lane: "Diagnostic",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Report Drafts",
    purpose: "Draft diagnostic and tool-specific reports awaiting review or publication.",
    lane: "Diagnostic",
    access: "admin-only",
    href: "/admin/report-drafts",
    reportable: true,
  },
  {
    name: "Saved Benchmarks",
    purpose: "Reference benchmarks captured from prior diagnostic runs.",
    lane: "Diagnostic",
    access: "admin-only",
    href: "/admin/saved-benchmarks",
  },

  // Implementation lane
  {
    name: "Implementation Workspace",
    purpose: "Coordinates rollout, SOPs, tasks, templates, and tool assignment.",
    lane: "Implementation",
    access: "admin-only",
    href: "/admin/implementation-workspace",
  },
  {
    name: "Implementation Roadmap",
    purpose: "Turns diagnostic findings into a sequenced implementation plan.",
    lane: "Implementation",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "SOP / Training Bible",
    purpose: "Captures repeatable SOPs and training material for the client team.",
    lane: "Implementation",
    pillar: "Operational Efficiency",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Decision Rights & Accountability",
    purpose: "Clarifies who decides, who executes, and who is informed.",
    lane: "Implementation",
    pillar: "Owner Independence",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Workflow / Process Mapping",
    purpose: "Maps core workflows so they can be reviewed, tightened, and assigned.",
    lane: "Implementation",
    pillar: "Operational Efficiency",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Tool Assignment + Training Tracker",
    purpose: "Tracks which RGS tools are assigned to a client and training status.",
    lane: "Implementation",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Tool Distribution",
    purpose: "Cross-portfolio view of how tools are distributed across clients.",
    lane: "Implementation",
    access: "admin-only",
    href: "/admin/tool-distribution",
  },

  // RGS Control System
  {
    name: "RGS Control System™",
    purpose: "Umbrella control surface across all five operating gears.",
    lane: "RGS Control System",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific surface — open from a client record.",
  },
  {
    name: "Revenue & Risk Monitor",
    purpose: "Tracks revenue health and risk signals across the engagement.",
    lane: "RGS Control System",
    pillar: "Financial Visibility",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Priority Action Tracker",
    purpose: "Keeps the highest-leverage repairs visible and accountable.",
    lane: "RGS Control System",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Owner Decision Dashboard",
    purpose: "Surfaces decisions awaiting the owner with the context to act.",
    lane: "RGS Control System",
    pillar: "Owner Independence",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Scorecard History",
    purpose: "Tracks stability scorecard movement over time.",
    lane: "RGS Control System",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Monthly System Review",
    purpose: "Captures recurring visibility, priorities, and owner decisions each month.",
    lane: "RGS Control System",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Advisory Notes / Clarification Log",
    purpose: "Structured advisory notes shared across diagnostic and operating cycles.",
    lane: "RGS Control System",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "Financial Visibility",
    purpose: "Connector-driven view of financial signals.",
    lane: "RGS Control System",
    pillar: "Financial Visibility",
    access: "admin + client review",
    customerScoped: true,
    notes: "Customer-specific tool — open from a client record.",
  },
  {
    name: "RGS Business Control Center",
    purpose: "Operational module hub used during active engagements.",
    lane: "RGS Control System",
    access: "admin-only",
    href: "/admin/rgs-business-control-center",
  },
  {
    name: "RGS Review Queue",
    purpose: "Items flagged for human RGS review before publication or action.",
    lane: "RGS Control System",
    access: "admin-only",
    href: "/admin/rgs-review-queue",
  },

  // Admin / System
  { name: "Customers", purpose: "Customer roster, lifecycle, and entitlements.", lane: "Admin / System", access: "admin-only", href: "/admin/customers" },
  { name: "Pending Accounts", purpose: "New accounts awaiting linking or onboarding.", lane: "Admin / System", access: "admin-only", href: "/admin/pending-accounts" },
  { name: "Client Health Overview", purpose: "Renewal risk and engagement health across clients.", lane: "Admin / System", access: "admin-only", href: "/admin/client-health" },
  { name: "Industry Brain", purpose: "Admin-only reference layer for industry-specific diagnostic logic.", lane: "Admin / System", access: "admin-only", href: "/admin/industry-brain" },
  { name: "Tool Catalog", purpose: "Catalog of every RGS tool and its metadata.", lane: "Admin / System", access: "admin-only", href: "/admin/tool-catalog" },
  { name: "Tool Library Admin", purpose: "Manages tool library content.", lane: "Admin / System", access: "admin-only", href: "/admin/tools" },
  { name: "Tool Operating Matrix", purpose: "Matrix of which tools are active per client.", lane: "Admin / System", access: "admin-only", href: "/admin/tool-matrix" },
  { name: "Walkthrough Videos", purpose: "Walkthrough video library shown across tools.", lane: "Admin / System", access: "admin-only", href: "/admin/walkthrough-videos" },
  { name: "Reports", purpose: "Published client reports.", lane: "Admin / System", access: "admin-only", href: "/admin/reports", reportable: true },
  { name: "Service Requests", purpose: "Inbound service requests from clients.", lane: "Admin / System", access: "admin-only", href: "/admin/service-requests" },
  { name: "Tasks", purpose: "Internal task tracker for the RGS team.", lane: "Admin / System", access: "admin-only", href: "/admin/tasks" },
  { name: "Templates", purpose: "Template library for reports and exports.", lane: "Admin / System", access: "admin-only", href: "/admin/templates" },
  { name: "Imports", purpose: "Reviews uploaded data files and worksheets.", lane: "Admin / System", access: "admin-only", href: "/admin/imports" },
  { name: "Files", purpose: "Files shared by or with clients.", lane: "Admin / System", access: "admin-only", href: "/admin/files" },
  { name: "Integration Planning", purpose: "Connector planning workspace.", lane: "Admin / System", access: "admin-only", href: "/admin/integration-planning" },
  { name: "System Readiness", purpose: "Operational readiness checks across the OS.", lane: "Admin / System", access: "admin-only", href: "/admin/system-readiness" },
  { name: "Files", purpose: "Files shared by or with clients.", lane: "Admin / System", access: "admin-only", href: "/admin/files" },
  { name: "Intelligence Demo", purpose: "Internal showcase of the OS intelligence layer for admin review.", lane: "Admin / System", access: "admin-only", href: "/admin/intelligence-demo" },
  { name: "Settings", purpose: "Workspace-level admin settings.", lane: "Admin / System", access: "admin-only", href: "/admin/settings" },
];

const LANES: Lane[] = ["Diagnostic", "Implementation", "RGS Control System", "Admin / System"];

function ToolCard({ tool }: { tool: ToolEntry }) {
  const Icon = tool.customerScoped ? Users : tool.access === "admin-only" ? Lock : LayoutGrid;
  const cardInner = (
    <div className="group rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/50 hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{tool.name}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tool.purpose}</p>
          </div>
        </div>
        {tool.href && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px] font-normal">{tool.lane}</Badge>
        {tool.pillar && <Badge variant="outline" className="text-[10px] font-normal">{tool.pillar}</Badge>}
        <Badge variant="secondary" className="text-[10px] font-normal capitalize">{tool.access}</Badge>
        {tool.reportable && <Badge variant="secondary" className="text-[10px] font-normal">Reportable</Badge>}
        {tool.customerScoped && (
          <Badge variant="outline" className="text-[10px] font-normal">Customer-specific</Badge>
        )}
      </div>
      {tool.notes && (
        <p className="text-[11px] text-muted-foreground/80 mt-2 italic">{tool.notes}</p>
      )}
    </div>
  );

  if (tool.href) {
    return <Link to={tool.href} className="block">{cardInner}</Link>;
  }
  return cardInner;
}

export function AdminToolDirectory() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeLane, setActiveLane] = useState<Lane | "All">("All");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = TOOLS.filter((t) => {
      if (activeLane !== "All" && t.lane !== activeLane) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        (t.pillar?.toLowerCase().includes(q) ?? false)
      );
    });
    return LANES.map((lane) => ({
      lane,
      tools: filtered.filter((t) => t.lane === lane),
    })).filter((g) => g.tools.length > 0);
  }, [query, activeLane]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="admin-tool-directory-trigger">
          <LayoutGrid className="h-4 w-4" />
          Open Tool Directory
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
        data-testid="admin-tool-directory-panel"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <SheetTitle className="text-xl font-light tracking-tight">RGS Tool Directory</SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            Every RGS tool, separated by service lane. Customer-specific tools are opened from
            inside a client record so access and tenant isolation stay intact.
          </SheetDescription>
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools by name, purpose, or pillar"
                className="pl-9 h-9 text-sm"
                data-testid="admin-tool-directory-search"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...LANES] as const).map((lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => setActiveLane(lane)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    activeLane === lane
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {lane}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6" data-testid="admin-tool-directory-scroll">
            {grouped.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                No tools match this search. Try a different keyword or clear the filter.
              </div>
            ) : (
              grouped.map((group) => (
                <section key={group.lane} data-testid={`tool-directory-group-${group.lane}`}>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {group.lane}
                    </h3>
                    <span className="text-[11px] text-muted-foreground/70">
                      {group.tools.length} tool{group.tools.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.tools.map((tool) => (
                      <ToolCard key={tool.name + group.lane} tool={tool} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export const ADMIN_TOOL_DIRECTORY_ENTRIES = TOOLS;
export const ADMIN_TOOL_DIRECTORY_LANES = LANES;