// Tool visibility model — single source of truth across the platform.
// DB enum values: 'internal' | 'customer' | 'client_editable'
// We map 'customer' → "Client Visible (read-only)" in the UI.
export type Visibility = "internal" | "customer" | "client_editable";

export const VISIBILITY_OPTIONS: { value: Visibility; label: string; short: string; description: string }[] = [
  {
    value: "internal",
    label: "Internal Only",
    short: "Internal",
    description: "Only RGS admins can see this tool. Never appears in the client portal.",
  },
  {
    value: "customer",
    label: "Client Visible",
    short: "Client View",
    description: "Clients can view this tool in their portal but cannot make changes.",
  },
  {
    value: "client_editable",
    label: "Client Editable",
    short: "Client Edit",
    description: "Clients can view and fill in / edit this tool from their portal.",
  },
];

export const visibilityMeta = (v: Visibility | string | null | undefined) =>
  VISIBILITY_OPTIONS.find((o) => o.value === v) ?? VISIBILITY_OPTIONS[0];

// Effective visibility = per-assignment override (if set) else the tool's own visibility.
export const effectiveVisibility = (
  toolVisibility: Visibility | string,
  override?: Visibility | string | null,
): Visibility => ((override || toolVisibility) as Visibility);

// Is the tool visible to clients in their portal?
export const isClientVisible = (v: Visibility | string | null | undefined) =>
  v === "customer" || v === "client_editable";

export const isClientEditable = (v: Visibility | string | null | undefined) => v === "client_editable";
export const isInternal = (v: Visibility | string | null | undefined) => v === "internal" || !v;
