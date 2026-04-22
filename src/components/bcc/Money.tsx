export const fmtMoney = (n: number, signed = false) => {
  const abs = Math.abs(Math.round(n));
  const s = `$${abs.toLocaleString()}`;
  if (signed) return n < 0 ? `−${s}` : `+${s}`;
  return n < 0 ? `−${s}` : s;
};

export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export function Money({ value, signed = false, className = "" }: { value: number; signed?: boolean; className?: string }) {
  const negative = value < 0;
  return (
    <span className={`${negative ? "text-rose-400" : signed ? "text-emerald-400" : "text-foreground"} ${className}`}>
      {fmtMoney(value, signed)}
    </span>
  );
}