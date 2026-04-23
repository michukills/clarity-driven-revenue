/**
 * P12.3.R — Row action menu for BCC entry tables.
 *
 * Renders an edit pencil + a delete trash that opens an AlertDialog
 * with a clear destructive label. Provenance-aware: imported rows
 * surface a one-line note explaining where they came from before
 * the user confirms deletion.
 */

import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { detectProvenance } from "@/lib/bcc/entryActions";

interface Props {
  rowLabel: string;
  row?: Record<string, unknown> | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RowActions({ rowLabel, row, onEdit, onDelete }: Props) {
  const provenance = row ? detectProvenance(row) : { imported: false };
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors"
          aria-label={`Edit ${rowLabel}`}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors"
              aria-label={`Delete ${rowLabel}`}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this {rowLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the entry from your tables and refreshes
                totals immediately. This action cannot be undone.
                {provenance.imported && (
                  <>
                    {" "}
                    <strong className="block mt-2">
                      Note: this row was originally {provenance.label?.toLowerCase()}.
                    </strong>
                    The original import batch reference is preserved on
                    other rows from the same file.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
