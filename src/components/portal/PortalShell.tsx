import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/RoleBadge";
import { ClientPreviewPicker } from "@/components/portal/ClientPreviewPicker";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Wrench,
  FolderOpen,
  Settings,
  LogOut,
  TrendingUp,
  User,
  Upload,
  FileText,
  CheckSquare,
  BarChart3,
  Search,
  Bell,
  Plus,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  History,
} from "lucide-react";
import {
  Activity,
  Stethoscope,
  Gauge,
  Radar,
} from "lucide-react";
import { Briefcase, Database } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/portal/NotificationsBell";
import { useRccAccess } from "@/lib/access/useRccAccess";
import { BackButton } from "@/components/portal/BackButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { to: string; icon: any; label: string; end?: boolean };

// Locked RGS OS domains
const adminPrimary: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Command Center", end: true },
  { to: "/admin/crm-pipeline", icon: KanbanSquare, label: "CRM / Pipeline" },
  { to: "/admin/client-management", icon: Users, label: "Client Management" },
  { to: "/admin/pending-accounts", icon: UserPlus, label: "Pending Accounts" },
  { to: "/admin/scorecard-leads", icon: Gauge, label: "Scorecard Leads" },
  { to: "/admin/diagnostic-interviews", icon: ClipboardList, label: "Diagnostic Interviews" },
  { to: "/admin/report-drafts", icon: FileText, label: "Report Drafts" },
];
// P12.4.H — Workspace-governed admin nav. The unified workspaces are the
// only entry points for diagnostic and implementation work; legacy domain
// pages remain reachable but only from inside the workspace they belong to.
// This makes the consolidation real in the rendered product instead of just
// adding more siblings.
const adminWorkspaces: NavItem[] = [
  { to: "/admin/diagnostic-workspace", icon: Stethoscope, label: "Diagnostic Workspace" },
  { to: "/admin/implementation-workspace", icon: Wrench, label: "Implementation Workspace" },
  { to: "/admin/rgs-business-control-center", icon: Briefcase, label: "RGS Business Control" },
];
// Intentionally separate from the workspaces: governs Revenue Tracker (RCC)
// assignment and add-on monitoring lifecycle. Stays a distinct, assignable
// surface by design.
const adminSeparate: NavItem[] = [
  { to: "/admin/add-on-monitoring", icon: Radar, label: "Add-On / Monitoring" },
];
const adminSystem: NavItem[] = [
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

// P12.4.H — Workspace-governed client nav. Provide Your Data is the single
// input workspace (it internally surfaces imports, files, connect, intake).
// Diagnostics / Scorecard / Reports are output surfaces. My Tools holds
// assigned tools. Monitoring + RCC stay separate and conditional. Legacy
// "My Files" + "Progress" routes still exist but are reached from inside
// the relevant workspace, not via top-level nav.
const customerNavBase: NavItem[] = [
  { to: "/portal", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/portal/provide-data", icon: Database, label: "Provide Your Data" },
  { to: "/portal/tools", icon: Wrench, label: "My Tools" },
  { to: "/portal/diagnostics", icon: Stethoscope, label: "Diagnostics" },
  { to: "/portal/scorecard", icon: Gauge, label: "Scorecard" },
  { to: "/portal/reports", icon: FileText, label: "Business Health Reports" },
  { to: "/portal/priority-tasks", icon: ListChecks, label: "Priority Tasks" },
  { to: "/portal/account", icon: User, label: "Account" },
];

// P6.1 — RCC nav item only rendered when the viewer has RCC access
// (admin or assigned addon resource). Inserted between Monitoring and Reports.
const RCC_NAV_ITEM: NavItem = {
  to: "/portal/business-control-center",
  icon: Briefcase,
  label: "Revenue Control Center",
};
function buildCustomerNav(hasRccAccess: boolean): NavItem[] {
  if (!hasRccAccess) return customerNavBase;
  // RCC is intentionally separate and assignable. Insert just before Account.
  const out = [...customerNavBase];
  const accountIdx = out.findIndex((i) => i.to === "/portal/account");
  out.splice(accountIdx, 0, RCC_NAV_ITEM);
  return out;
}

function AppSidebar({ variant }: { variant: "admin" | "customer" }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasAccess: hasRccAccess } = useRccAccess();
  const customerNav = buildCustomerNav(hasRccAccess);

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton asChild tooltip={item.label}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md transition-colors",
                  isActive
                    ? "bg-primary/15 text-foreground border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border px-3 py-4">
        {!collapsed ? (
          <div>
            <div className="text-sm font-semibold tracking-wide text-foreground">RGS OS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
              {variant === "admin" ? "Command Center" : "Client Portal"}
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold tracking-wide text-foreground text-center">R</div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {variant === "admin" ? (
          <>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Command</SidebarGroupLabel>}
              <SidebarGroupContent>{renderItems(adminPrimary)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Workspaces</SidebarGroupLabel>}
              <SidebarGroupContent>{renderItems(adminWorkspaces)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Separate · Assignable</SidebarGroupLabel>}
              <SidebarGroupContent>{renderItems(adminSeparate)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>System</SidebarGroupLabel>}
              <SidebarGroupContent>{renderItems(adminSystem)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Portal</SidebarGroupLabel>}
            <SidebarGroupContent>{renderItems(customerNav)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <SignOutButton collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handle = async () => {
    await signOut();
    // P8.3 — return user to the public homepage on sign out so they
    // land on the marketing site, not the login screen.
    navigate("/");
  };
  if (collapsed) {
    return (
      <button
        onClick={handle}
        className="flex items-center justify-center w-full p-2 text-muted-foreground hover:text-foreground"
        title="Sign out"
        aria-label="Log out and return home"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }
  return (
    <div>
      <div className="text-[11px] text-muted-foreground truncate mb-2">{user?.email}</div>
      <button
        onClick={handle}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Log out and return home"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </div>
  );
}

function TopBar({ variant }: { variant: "admin" | "customer" }) {
  const navigate = useNavigate();
  const { isAdmin, previewAsClient, previewCustomerId, setPreviewCustomer, signOut } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!previewCustomerId) {
      setPreviewLabel(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("customers")
      .select("full_name, business_name, email")
      .eq("id", previewCustomerId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPreviewLabel(
          data?.business_name?.trim() ||
            data?.full_name?.trim() ||
            data?.email ||
            "Selected client"
        );
      });
    return () => {
      cancelled = true;
    };
  }, [previewCustomerId]);

  // P8.3 — top-right logout pill. Visible to both admin and client users.
  // Calls the shared AuthContext signOut and returns the user to the
  // public homepage `/` so they land on the marketing site, not /auth.
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  return (
    <>
    <header className="h-14 border-b border-border bg-[hsl(0_0%_10%)] flex items-center gap-3 px-4 sticky top-0 z-20">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="h-5 w-px bg-border mx-1" />
      <BackButton />
      <div className="relative flex-1 max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          placeholder={variant === "admin" ? "Search clients, tools, tasks…" : "Search your portal…"}
          className="w-full pl-9 pr-3 h-9 rounded-md bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isAdmin && variant === "customer" && previewAsClient && previewLabel && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md bg-amber-500/15 text-amber-300 text-xs border border-amber-500/30 max-w-[18rem] truncate"
            title={`Client Preview: ${previewLabel}`}
          >
            <Eye className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">Client Preview: {previewLabel}</span>
          </span>
        )}
        <RoleBadge />
        {isAdmin && variant === "admin" && (
          <button
            onClick={() => setPickerOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Choose a client to preview their portal"
          >
            <Eye className="h-3.5 w-3.5" /> View as client
          </button>
        )}
        {isAdmin && variant === "customer" && previewAsClient && (
          <button
            onClick={() => {
              setPreviewCustomer(null);
              navigate("/admin");
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md bg-amber-500/15 text-amber-500 text-xs hover:bg-amber-500/25 transition-colors"
          >
            <EyeOff className="h-3.5 w-3.5" /> Exit preview
          </button>
        )}
        {isAdmin && variant === "customer" && !previewAsClient && (
          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md bg-primary/15 text-primary text-xs hover:bg-primary/25 transition-colors"
          >
            <Shield className="h-3.5 w-3.5" /> Back to Admin
          </Link>
        )}
        {variant === "admin" && (
          <button
            onClick={() => navigate("/admin/customers")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-primary/15 text-primary text-xs hover:bg-primary/25 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Client
          </button>
        )}
        <NotificationsBell variant={variant} />
        <button
          onClick={handleLogout}
          aria-label="Log out and return home"
          title="Log out and return home"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Log out</span>
          <span className="hidden md:inline text-muted-foreground/60">→ Home</span>
        </button>
      </div>
    </header>
      <ClientPreviewPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
}

export const PortalShell = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "admin" | "customer";
}) => {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar variant={variant} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar variant={variant} />
          <main className="flex-1 px-6 lg:px-10 py-8 max-w-[1500px] w-full">{children}</main>
          {/* Legal footer always sits in normal flow below the main area.
              z-30 keeps it above any in-page sticky elements; no fixed
              floating CTA exists in the portal/admin shell. */}
          <PortalLegalFooter />
        </div>
      </div>
    </SidebarProvider>
  );
};

// P13.LegalFoundation.1 — site-wide legal links inside the portal/admin
// shell. Kept small and unobtrusive so it doesn't compete with the
// authenticated navigation, but always reachable from any portal/admin page.
function PortalLegalFooter() {
  return (
    <footer className="relative z-30 mt-auto border-t border-border bg-[hsl(0_0%_10%)]">
      <div className="px-6 lg:px-10 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground">
        <div>© {new Date().getFullYear()} Revenue &amp; Growth Systems LLC</div>
        <nav aria-label="Legal" className="flex items-center gap-4 relative z-10">
          <Link
            to="/eula"
            className="hover:text-foreground transition-colors"
          >
            EULA
          </Link>
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Statement
          </Link>
        </nav>
      </div>
    </footer>
  );
}
