/**
 * Industry Brain Catalog Panel — admin-only reference view.
 *
 * Renders the structured `INDUSTRY_BRAIN_CATALOG` (15 categories × every
 * supported industry) with:
 *   - industry switcher
 *   - search across category labels and variables
 *   - collapsible per-category groups
 *   - scrollable variable lists so dense categories stay readable on
 *     mobile and desktop
 *
 * This panel is a reference surface for admins. It does not edit data —
 * it shows the canonical variable coverage that backs diagnostic, repair
 * map, implementation, and RGS Control System work.
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_LABEL,
  INDUSTRY_BRAIN_CATALOG,
  totalVariablesForIndustry,
  type CatalogCategoryKey,
} from "@/lib/industryBrainCatalog";
import { INDUSTRY_KEYS, INDUSTRY_LABEL, type IndustryKey } from "@/lib/industryBrain";

export function IndustryBrainCatalogPanel() {
  const [industry, setIndustry] = useState<IndustryKey>("trades_services");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<CatalogCategoryKey, boolean>>(
    () => Object.fromEntries(CATALOG_CATEGORIES.map((c) => [c, false])) as Record<CatalogCategoryKey, boolean>,
  );

  const catalog = INDUSTRY_BRAIN_CATALOG[industry];
  const total = totalVariablesForIndustry(industry);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG_CATEGORIES.map((cat) => {
      const items = catalog[cat];
      if (!q) return { cat, items };
      const labelHit = CATALOG_CATEGORY_LABEL[cat].toLowerCase().includes(q);
      const matches = labelHit ? items : items.filter((v) => v.toLowerCase().includes(q));
      return { cat, items: matches };
    });
  }, [catalog, query]);

  const toggle = (c: CatalogCategoryKey) =>
    setCollapsed((s) => ({ ...s, [c]: !s[c] }));

  const expandAll = () =>
    setCollapsed(Object.fromEntries(CATALOG_CATEGORIES.map((c) => [c, false])) as Record<CatalogCategoryKey, boolean>);
  const collapseAll = () =>
    setCollapsed(Object.fromEntries(CATALOG_CATEGORIES.map((c) => [c, true])) as Record<CatalogCategoryKey, boolean>);

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-4"
      aria-labelledby="industry-brain-catalog-heading"
      data-testid="industry-brain-catalog-panel"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="industry-brain-catalog-heading"
            className="text-lg text-foreground font-serif"
          >
            Industry Brain — variable coverage reference
          </h2>
          <Badge variant="outline">Admin reference</Badge>
        </div>
        <p className="text-xs text-muted-foreground max-w-3xl">
          Canonical variable coverage per industry, grouped into the 15
          categories used by the diagnostic, repair-map, implementation, and
          RGS Control System surfaces. Use search and collapse to navigate
          dense categories. Cannabis / MMJ / MMC entries are dispensary,
          retail, and regulated cannabis operations only — never healthcare,
          patient-care, HIPAA, insurance claims, medical billing, or clinical
          workflows. Compliance-sensitive entries are visibility support
          only. They are not legal advice and not a compliance guarantee.
          State-specific rules may apply.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="ib-industry">
          Industry
        </label>
        <select
          id="ib-industry"
          className="bg-background border border-border rounded-md px-2 py-1 text-sm"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as IndustryKey)}
        >
          {INDUSTRY_KEYS.map((k) => (
            <option key={k} value={k}>
              {INDUSTRY_LABEL[k]}
            </option>
          ))}
        </select>
        <Input
          aria-label="Search variables"
          placeholder="Search variables…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[220px] flex-1 max-w-md"
        />
        <Button type="button" variant="outline" size="sm" onClick={expandAll}>
          Expand all
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
          Collapse all
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {total} variables across {CATALOG_CATEGORIES.length} categories
        </span>
      </div>

      <ul className="space-y-3" role="list">
        {filtered.map(({ cat, items }) => {
          const isCollapsed = collapsed[cat];
          return (
            <li
              key={cat}
              className="border border-border rounded-lg bg-background/40"
              data-category={cat}
            >
              <button
                type="button"
                onClick={() => toggle(cat)}
                aria-expanded={!isCollapsed}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="text-sm text-foreground">
                  {CATALOG_CATEGORY_LABEL[cat]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "variable" : "variables"}
                </span>
              </button>
              {!isCollapsed && (
                <div className="px-3 pb-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No variables match the current search.
                    </p>
                  ) : (
                    <ul
                      className="max-h-72 overflow-y-auto pr-1 space-y-1 text-sm text-foreground"
                      role="list"
                    >
                      {items.map((v) => (
                        <li
                          key={v}
                          className="break-words leading-snug border-b border-border/40 last:border-b-0 py-1"
                        >
                          {v}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default IndustryBrainCatalogPanel;