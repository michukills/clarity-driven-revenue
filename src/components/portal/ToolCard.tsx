import { ExternalLink, Download, Trash2, Users, Image as ImageIcon, Pencil, FileText, FileSpreadsheet, FileImage, Link as LinkIcon } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, toolTypeLabel } from "@/lib/portal";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import type { Visibility } from "@/lib/visibility";

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
}

export function ToolCard({ tool, assignedCount, onAssign, onEdit, onDelete, showAdminActions, visibilityOverride }: Props) {
  const Icon = typeIcon(tool.resource_type);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors flex flex-col">
      {tool.screenshot_url && (
        <a href={tool.screenshot_url} target="_blank" rel="noreferrer" className="block aspect-video bg-muted/40 overflow-hidden border-b border-border">
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
              <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {showAdminActions && onDelete && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
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

        <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-2">
          {tool.url && tool.url.startsWith("/") ? (
            <RouterLink to={tool.url} className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary">
              <ExternalLink className="h-3 w-3" /> Open
            </RouterLink>
          ) : tool.url ? (
            <a href={tool.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary">
              <ExternalLink className="h-3 w-3" /> Open
            </a>
          ) : null}
          {tool.url && tool.downloadable && !tool.url.startsWith("/") && (
            <a href={tool.url} download className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Download className="h-3 w-3" /> Download
            </a>
          )}
          {tool.screenshot_url && (
            <a href={tool.screenshot_url} download className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-3 w-3" /> Screenshot
            </a>
          )}
          {showAdminActions && tool.visibility !== "internal" && onAssign && (
            <button onClick={onAssign} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Users className="h-3 w-3" /> Assign{typeof assignedCount === "number" ? ` (${assignedCount})` : ""}
            </button>
          )}
        </div>

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
