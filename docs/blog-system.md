# RGS Blog System (P39)

The public blog lives at `/blog` (index) and `/blog/:slug` (post). It is a
lightweight, file-based system — no CMS, no remote fetch, no fake proof.

## Data structure

All posts live in `src/lib/blog/posts.ts` as a typed `BlogPost[]`.
Each post has SEO metadata, a typed `body` of blocks (`p`, `h2`, `h3`,
`callout`, `list`), CTA hint, related slugs, and `status`.

## Add a new post

1. Append a `BlogPost` to `blogPosts` in `src/lib/blog/posts.ts`.
2. Pick a clean kebab-case `slug`. Keep `seoTitle` < 70 chars and
   `seoDescription` 60–180 chars.
3. Body must include at least 3 `h2` blocks and 5 substantive paragraphs.
4. Set `related` to 1–3 sibling slugs.
5. Run `vitest src/lib/__tests__/blogSystemContract.test.ts`.

## Voice / quality checklist

- Calm, plain-spoken, owner-respecting. Sounds like a sharp operator,
  not a content farm.
- No “in today’s fast-paced business world” style intros.
- No bullet-list-only articles. Use prose with section rhythm.
- No fabricated stats, clients, testimonials, or case studies.
- No guaranteed outcomes. No legal / tax / accounting / financial
  advice claims.
- Use the gear/system metaphor when it earns its keep, not as filler.

## SEO checklist

- `seoTitle`, `seoDescription`, `canonical` (set automatically from slug).
- Single H1 (the post title) — body uses h2/h3 only.
- Internal links to Scorecard, Why RGS Is Different, and (where appropriate)
  the Diagnostic.
- Related posts wired via `related: string[]`.

## Visual rules

- No fake dashboards, no fake screenshots, no broken `<img>` placeholders.
- Blog cards rely on type + dark surfaces. Add real visual blocks only
  when an asset exists.

## CTA rules

- Primary: “Take the 0–1000 Scorecard”.
- Secondary: “See Why RGS Is Different”.
- Optional: “Watch the Demo”.
- Diagnostic CTA appears once near the bottom — never pushed in every
  paragraph.

## No-fake-proof rules

The contract test (`src/lib/__tests__/blogSystemContract.test.ts`)
enforces, for every post:

- no `testimonial`, `case study`, `trusted by`, `hundreds of clients`,
  `proven results`, `guaranteed revenue/results/ROI/growth/outcomes`
- no `10x`, `2x your`, `double your`, `triple your`, `skyrocket`
- no “in today’s fast-paced” style filler intros
- no “we provide legal/tax/accounting/financial advice” claims
- no “certified financial/legal/tax/accounting advisor” claims

## Publishing checklist

- [ ] Slug is unique and kebab-case
- [ ] SEO title and description set
- [ ] At least 3 h2 sections, 5 paragraphs
- [ ] Internal links to Scorecard + Why RGS Is Different
- [ ] No fake proof, no advice claims, no guaranteed outcomes
- [ ] `vitest run src/lib/__tests__/blogSystemContract.test.ts` is green