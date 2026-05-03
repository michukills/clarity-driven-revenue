# XML Sitemap / Robots / Google Crawl Repair (P48.1)

## Issue found
- `public/sitemap.xml` and `public/robots.txt` were referencing the
  staging-style host `clarity-driven-revenue.lovable.app` instead of the
  canonical production host `https://www.revenueandgrowthsystems.com`.
- The SEO `<canonical>` origin in `src/components/SEO.tsx` and several
  helper files used the same stale host, so every public page emitted a
  canonical URL that did not match the domain Google was crawling.
- Several public marketing pages (`/why-rgs-is-different`, `/blog`,
  individual blog articles, `/start`, `/eula`, `/privacy`) were missing
  from the sitemap, so Google had no path to discover them.
- No broken `sitemap_index.xml` / `sitemap-index.xml` file is referenced
  anywhere in the repo. Search Console reports of a 404 on a sitemap-index
  URL are external requests for files we have never published; we
  intentionally use a single `/sitemap.xml`.

## What changed
- **`public/sitemap.xml`** — rewritten using
  `https://www.revenueandgrowthsystems.com` as the canonical host. Now
  includes the homepage, `/what-we-do`, `/system`, `/why-rgs-is-different`,
  `/scorecard`, `/start`, `/diagnostic`, `/implementation`,
  `/revenue-control-system`, `/demo`, `/contact`, `/blog`, the three
  static blog articles, all six SEO insight spokes, `/eula`, and
  `/privacy`. Private/portal/admin/auth/payment routes are **not**
  included.
- **`public/robots.txt`** — rewritten to reference the canonical sitemap
  and to disallow `/admin`, `/portal`, `/auth`, `/claim-invite`,
  `/diagnostic-apply`, `/diagnostic-interview`, `/diagnostic-offer-legacy`,
  `/api/`, and `/functions/`. Public crawling stays fully allowed.
- **`src/components/SEO.tsx`** — `SITE_ORIGIN` now points to the
  production domain so every page emits the correct
  `<link rel="canonical">` and `og:url`.
- **`src/lib/admin/systemReadiness.ts`** and **`src/pages/BlogPost.tsx`** —
  stale lovable-staging URL references swapped for the canonical domain.

## Canonical domain
`https://www.revenueandgrowthsystems.com`

## Public URLs included
Homepage, What We Do, System, Why RGS is Different, Scorecard, Start,
Diagnostic, Implementation, Revenue Control System, Demo, Contact, Blog
index, three static blog articles, six insight spokes, EULA, Privacy.

## Private URLs excluded
`/admin*`, `/portal*`, `/auth`, `/claim-invite`, `/diagnostic-apply`,
`/diagnostic-interview`, `/diagnostic-offer-legacy`, `/api/*`,
`/functions/*`, all client tool routes, all admin routes.

## Sitemap index decision
Single `/sitemap.xml`. The site has fewer than 50 URLs, so a sitemap
index is unnecessary and would only add another file Google could 404
on. No alias or redirect for `sitemap_index.xml` was added because no
external system in our control references one and Lovable hosting does
not process redirect config files.

## Google Search Console — manual next steps
1. Open `https://www.revenueandgrowthsystems.com/sitemap.xml` in a browser
   and confirm valid XML loads (no redirect, no 404).
2. Open `https://www.revenueandgrowthsystems.com/robots.txt` and confirm
   the `Sitemap:` line points to the canonical URL.
3. In Google Search Console, **Sitemaps → Add a new sitemap**, submit
   `sitemap.xml`. Remove any previously submitted sitemap referencing
   `clarity-driven-revenue.lovable.app` or `sitemap_index.xml`.
4. **URL Inspection** for `/`, `/scorecard`, `/diagnostic`, and `/blog`,
   then **Request indexing** on each.
5. Check the **Pages** report after 48–72 hours and confirm the new URLs
   move from *Discovered* to *Indexed*.
6. If the property is still verified for `clarity-driven-revenue.lovable.app`,
   add a Search Console property for `www.revenueandgrowthsystems.com`
   (or the domain property `revenueandgrowthsystems.com`) and treat that
   as the production property going forward.

## Manual verification checklist
- [ ] `/sitemap.xml` returns valid XML, 200 OK
- [ ] `/robots.txt` returns 200 OK and references the correct sitemap
- [ ] Homepage canonical points to `https://www.revenueandgrowthsystems.com/`
- [ ] No 404 / redirect loop on either file
- [ ] Submitted in Google Search Console
- [ ] Indexing requested for homepage, scorecard, diagnostic, blog
- [ ] Pages move to *Indexed* within 3–7 days

## Deferred
- Automated dynamic sitemap generation from the blog registry at build
  time. Today the three static blog slugs are hand-listed; re-run this
  doc / sitemap whenever a new article is added.
- Adding `<lastmod>` per URL. Skipped for now to avoid lying about
  recency for evergreen pages.
