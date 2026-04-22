import { Download, Trash2, Users, Image as ImageIcon, Pencil, FileText, FileSpreadsheet, FileImage, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, toolTypeLabel } from "@/lib/portal";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import type { Visibility } from "@/lib/visibility";
import { classifyTool, launchToolTarget } from "@/lib/toolLaunch";

type Tool = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  resource_type: string;
  visibility: Visibility | string;
  url: string | null;
  file_path: string | null;
  screenshot_url: string | null;
  downloadable: boolean;
};

const typeIcon = (t: string) => {
  switch (t) {
    case "spreadsheet":
    case "sheet":
      return FileSpreadsheet;
    case "pdf":
      return FileText;
    case "image":
      return FileImage;
    case "link":
      return LinkIcon;
    default:
      return FileText;
  }
};

interface Props {
  tool: Tool;
  assignedCount?: number;
  onAssign?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showAdminActions?: boolean;
  /** Optional per-assignment visibility override (when shown in a client context) */
  visibilityOverride?: Visibility | string | null;
  /** "admin" routes to /admin/tools/* runners; "client" routes to /portal/tools/* runners. */
  launchContext?: "admin" | "client";
}

export function ToolCard({ tool, assignedCount, onAssign, onEdit, onDelete, showAdminActions, visibilityOverride, launchContext }: Props) {
  const Icon = typeIcon(tool.resource_type);
  const context: "admin" | "client" = launchContext ?? (showAdminActions ? "admin" : "client");
  const launch = classifyTool({ title: tool.title, url: tool.url }, context);
  const navigate = useNavigate();

  const isClickable = launch.kind !== "none";

  const openTool = () => {
    launchToolTarget(launch, navigate);
  };

  // Stop card-level click/keydown from firing when interacting with nested controls.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openTool();
    }
  };

  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden transition-colors flex flex-col ${
        isClickable
          ? "cursor-pointer hover:border-primary/60 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : "hover:border-primary/40"
      }`}
      onClick={isClickable ? openTool : undefined}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open ${tool.title}` : undefined}
    >
      {tool.screenshot_url && (
        <a
          href={tool.screenshot_url}
          target="_blank"
          rel="noreferrer"
          onClick={stop}
          className="block aspect-video bg-muted/40 overflow-hidden border-b border-border"
        >
          <img src={tool.screenshot_url} alt={`${tool.title} preview`} className="w-full h-full object-cover" />
        </a>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-sm text-foreground font-medium truncate">{tool.title}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <VisibilityBadge visibility={tool.visibility} override={visibilityOverride} size="sm" />
            {showAdminActions && onEdit && (
              <button
                onClick={(e) => { stop(e); onEdit(); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {showAdminActions && onDelete && (
              <button
                onClick={(e) => { stop(e); onDelete(); }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <Badge variant="secondary" className="text-[10px] font-normal bg-muted/60 text-muted-foreground">
            {toolTypeLabel(tool.resource_type)}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-4">
          {tool.description || "—"}
        </div>

        {isClickable && (
          <div className="text-[10px] uppercase tracking-[0.14em] text-primary/70 mb-2">
            <span className="hidden sm:inline">Click card to launch</span>
            <span className="sm:hidden">Tap card to launch</span>
          </div>
        )}

        {(() => {
          const hasDownload = launch.kind === "external" && tool.downloadable;
          const hasScreenshot = !!tool.screenshot_url;
          const hasAssign = !!(showAdminActions && tool.visibility !== "internal" && onAssign);
          const hasFooter = launch.kind === "none" || isClickable || hasDownload || hasScreenshot || hasAssign;
          if (!hasFooter) return null;
          return (
        <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-2">
          {launch.kind === "none" ? (
            <span className="text-xs text-muted-foreground italic">
              This tool is not connected yet.
              {showAdminActions && (
                <span className="block text-[10px] not-italic text-muted-foreground/80 mt-1">
                  Add a valid resource URL or connect this tool to an internal RGS OS route.
                </span>
              )}
            </span>
          ) : null}
          {hasDownload && (
            <a
              href={launch.href}
              download
              onClick={stop}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          )}
          {hasScreenshot && (
            <a
              href={tool.screenshot_url}
              download
              onClick={stop}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ImageIcon className="h-3 w-3" /> Screenshot
            </a>
          )}
          {hasAssign && (
            <button
              onClick={(e) => { stop(e); onAssign!(); }}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Users className="h-3 w-3" /> Assign{typeof assignedCount === "number" ? ` (${assignedCount})` : ""}
            </button>
          )}
        </div>
          );
        })()}

        {showAdminActions && (
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-3">
            {categoryLabel(tool.category)}
          </div>
        )}
      </div>
    </div>
  );
}

export type { Tool };
