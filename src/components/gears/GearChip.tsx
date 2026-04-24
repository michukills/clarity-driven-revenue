import { gearMeta } from "@/lib/gears/targetGear";

export function GearChip({
  gear,
  size = "sm",
  showName = false,
}: {
  gear: number | null | undefined;
  size?: "xs" | "sm";
  showName?: boolean;
}) {
  const meta = gearMeta(gear);
  if (!meta) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border">
        Ungeared
      </span>
    );
  }
  const cls = size === "xs" ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`${cls} rounded border font-semibold whitespace-nowrap ${meta.chipClass}`}
      title={`${meta.name} · ${meta.metaphor} · ${meta.purpose}`}
    >
      {showName ? meta.short : `G${meta.gear}`}
    </span>
  );
}

export function GearSelect({
  value,
  onChange,
  className = "",
}: {
  value: number | null | undefined;
  onChange: (gear: number | null) => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`text-[11px] px-2 py-1 rounded-md border border-border bg-card text-foreground ${className}`}
    >
      <option value="">Ungeared</option>
      <option value="1">G1 · Demand Generation</option>
      <option value="2">G2 · Revenue Conversion</option>
      <option value="3">G3 · Operational Efficiency</option>
      <option value="4">G4 · Financial Visibility</option>
      <option value="5">G5 · Owner Independence</option>
    </select>
  );
}