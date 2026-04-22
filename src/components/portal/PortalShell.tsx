import { ReactNode } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/RoleBadge";
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
} from "lucide-react";
import {
  Activity,
  Stethoscope,
  Gauge,
  Radar,
} from "lucide-react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/portal/NotificationsBell";
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
];
const adminWork: NavItem[] = [
  { to: "/admin/tool-distribution", icon: Wrench, label: "Tool Distribution" },
  { to: "/admin/scorecard-system", icon: Gauge, label: "Scorecard System" },
  { to: "/admin/diagnostic-system", icon: Stethoscope, label: "Diagnostic System" },
  { to: "/admin/operations-sop", icon: CheckSquare, label: "Operations / SOP" },
  { to: "/admin/revenue-financials", icon: BarChart3, label: "Revenue / Financials" },
  { to: "/admin/add-on-monitoring", icon: Radar, label: "Add-On / Monitoring" },
  { to: "/admin/business-control-center", icon: Briefcase, label: "Business Control Center" },
];
const adminSystem: NavItem[] = [
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const customerNav: NavItem[] = [
  { to: "/portal", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/portal/tools", icon: Wrench, label: "My Tools" },
  { to: "/portal/diagnostics", icon: Stethoscope, label: "Diagnostics" },
  { to: "/portal/scorecard", icon: Gauge, label: "Scorecard" },
  { to: "/portal/monitoring", icon: Radar, label: "Monitoring" },
  { to: "/portal/business-control-center", icon: Briefcase, label: "Business Control Center" },
  { to: "/portal/uploads", icon: Upload, label: "My Files" },
  { to: "/portal/progress", icon: TrendingUp, label: "Progress" },
  { to: "/portal/account", icon: User, label: "Account" },
];

function AppSidebar({ variant }: { variant: "admin" | "customer" }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
              {!collapsed && <SidebarGroupLabel>RGS OS Domains</SidebarGroupLabel>}
              <SidebarGroupContent>{renderItems(adminWork)}</SidebarGroupContent>
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
    navigate("/auth");
  };
  if (collapsed) {
    return (
      <button
        onClick={handle}
        className="flex items-center justify-center w-full p-2 text-muted-foreground hover:text-foreground"
        title="Sign out"
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
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </div>
  );
}

function TopBar({ variant }: { variant: "admin" | "customer" }) {
  const navigate = useNavigate();
  const { isAdmin, previewAsClient, setPreviewAsClient } = useAuth();
  return (
    <header className="h-14 border-b border-border bg-[hsl(0_0%_10%)] flex items-center gap-3 px-4 sticky top-0 z-20">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="h-5 w-px bg-border mx-1" />
      <div className="relative flex-1 max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          placeholder={variant === "admin" ? "Search clients, tools, tasks…" : "Search your portal…"}
          className="w-full pl-9 pr-3 h-9 rounded-md bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <RoleBadge />
        {isAdmin && variant === "admin" && (
          <button
            onClick={() => {
              setPreviewAsClient(true);
              navigate("/portal");
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Preview the client portal experience"
          >
            <Eye className="h-3.5 w-3.5" /> Preview as client
          </button>
        )}
        {isAdmin && variant === "customer" && previewAsClient && (
          <button
            onClick={() => {
              setPreviewAsClient(false);
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
      </div>
    </header>
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
        </div>
      </div>
    </SidebarProvider>
  );
};
