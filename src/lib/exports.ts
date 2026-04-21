import jsPDF from "jspdf";

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) {
    alert("Nothing to export.");
    return;
  }
  const cols = Array.from(rows.reduce((set, r) => {
    Object.keys(r).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- PDF ----
type PdfSection =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "kv"; pairs: [string, string][] }
  | { type: "paragraph"; text: string }
  | { type: "bar"; label: string; value: number; max: number; suffix?: string }
  | { type: "spacer"; height?: number }
  | { type: "rule" };

export interface PdfDoc {
  title: string;
  subtitle?: string;
  meta?: [string, string][];
  sections: PdfSection[];
}

const BRAND = {
  bg: [31, 31, 31] as [number, number, number],
  primary: [107, 123, 58] as [number, number, number],
  accent: [143, 163, 90] as [number, number, number],
  text: [245, 245, 245] as [number, number, number],
  muted: [170, 170, 170] as [number, number, number],
  border: [70, 70, 70] as [number, number, number],
};

export function generateRunPdf(filename: string, doc: PdfDoc) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const M = 56; // margin
  let y = M;

  const fillBg = () => {
    pdf.setFillColor(...BRAND.bg);
    pdf.rect(0, 0, pageW, pageH, "F");
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - M) {
      pdf.addPage();
      fillBg();
      y = M;
    }
  };

  fillBg();

  // Header band
  pdf.setFillColor(...BRAND.primary);
  pdf.rect(0, 0, pageW, 6, "F");

  // RGS branding
  pdf.setTextColor(...BRAND.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("REVENUE & GROWTH SYSTEMS", M, y);
  y += 22;

  // Title
  pdf.setTextColor(...BRAND.text);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(doc.title, M, y);
  y += 8;

  if (doc.subtitle) {
    y += 14;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...BRAND.muted);
    const lines = pdf.splitTextToSize(doc.subtitle, pageW - M * 2);
    pdf.text(lines, M, y);
    y += lines.length * 13;
  }

  if (doc.meta && doc.meta.length) {
    y += 12;
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.muted);
    doc.meta.forEach(([k, v]) => {
      pdf.text(`${k}: `, M, y);
      const kW = pdf.getTextWidth(`${k}: `);
      pdf.setTextColor(...BRAND.text);
      pdf.text(v, M + kW, y);
      pdf.setTextColor(...BRAND.muted);
      y += 13;
    });
  }
  y += 12;
  pdf.setDrawColor(...BRAND.border);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, pageW - M, y);
  y += 18;

  // Sections
  for (const s of doc.sections) {
    if (s.type === "heading") {
      ensureSpace(34);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...BRAND.text);
      pdf.text(s.text, M, y);
      y += 8;
      pdf.setDrawColor(...BRAND.primary);
      pdf.setLineWidth(1.2);
      pdf.line(M, y, M + 40, y);
      y += 16;
    } else if (s.type === "subheading") {
      ensureSpace(20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...BRAND.muted);
      pdf.text(s.text.toUpperCase(), M, y);
      y += 16;
    } else if (s.type === "kv") {
      ensureSpace(s.pairs.length * 16 + 4);
      pdf.setFontSize(10);
      s.pairs.forEach(([k, v]) => {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...BRAND.muted);
        pdf.text(k, M, y);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...BRAND.text);
        const lines = pdf.splitTextToSize(v, pageW - M * 2 - 180);
        pdf.text(lines, M + 180, y);
        y += Math.max(14, lines.length * 13);
      });
      y += 6;
    } else if (s.type === "paragraph") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...BRAND.text);
      const lines = pdf.splitTextToSize(s.text, pageW - M * 2);
      ensureSpace(lines.length * 13 + 6);
      pdf.text(lines, M, y);
      y += lines.length * 13 + 4;
    } else if (s.type === "bar") {
      ensureSpace(28);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...BRAND.text);
      pdf.text(s.label, M, y);
      const valStr = `${s.value}${s.suffix ?? ""}${s.max ? ` / ${s.max}` : ""}`;
      const vw = pdf.getTextWidth(valStr);
      pdf.setTextColor(...BRAND.muted);
      pdf.text(valStr, pageW - M - vw, y);
      y += 6;
      const barW = pageW - M * 2;
      pdf.setFillColor(60, 60, 60);
      pdf.rect(M, y, barW, 4, "F");
      const pct = s.max ? Math.min(1, s.value / s.max) : 0;
      pdf.setFillColor(...BRAND.primary);
      pdf.rect(M, y, barW * pct, 4, "F");
      y += 18;
    } else if (s.type === "spacer") {
      y += s.height ?? 12;
    } else if (s.type === "rule") {
      ensureSpace(14);
      pdf.setDrawColor(...BRAND.border);
      pdf.setLineWidth(0.5);
      pdf.line(M, y, pageW - M, y);
      y += 14;
    }
  }

  // Footer
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(`Generated ${new Date().toLocaleDateString()}`, M, pageH - 24);
    pdf.text(`Page ${i} of ${total}`, pageW - M, pageH - 24, { align: "right" });
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
