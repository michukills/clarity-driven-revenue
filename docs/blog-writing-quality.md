# RGS Blog Writing & SEO Quality Standard (P40)

The blog is a credibility asset, not a content farm. Every published post
should sound like a sharp operator wrote it for owners of real businesses.
If a draft does not clear the bar below, mark it `qualityStatus: "draft"`
or `"review_needed"` instead of publishing it.

## Voice rules (Matt / RGS)

- Calm, direct, plain-spoken, owner-respecting.
- Short readable paragraphs. Vary sentence length.
- Concrete examples over abstract claims.
- Use the gear / slipping / system-pressure metaphor when it earns its keep.
- Never sound like a coach selling a course or a generic SEO blog.

## Banned phrases (will fail contract tests)

- "in today's fast-paced business world"
- "unlock your potential"
- "take your business to the next level"
- "game changer" / "game-changer"
- "leverage synergy" / "synergize"
- "comprehensive guide"
- "in conclusion" / "in summary"
- "it is important to note"
- "this article will explore"
- "whether you are a small business owner or entrepreneur"

## No-fake-proof checklist

- No testimonials, case studies, "trusted by", "hundreds of clients".
- No fabricated stats, dashboards, or screenshots.
- No guaranteed revenue / results / ROI / growth / outcomes.
- No "10x", "2x your", "double your", "triple your", "skyrocket".
- No claim of providing legal, tax, accounting, or financial advice.

## Expert SEO checklist (per post)

- `seoTitle` ≤ 70 chars, specific, no clickbait.
- `seoDescription` 60–165 chars, natural, reads like a human wrote it.
- `primaryKeyword` set; 3–5 `secondaryKeywords` set.
- Slug is clean kebab-case and unique.
- One H1 (the title). Body uses h2/h3 only.
- At least 3 h2 sections and 5 substantive paragraphs.
- Internal links to Scorecard and Why RGS Is Different.
- 1–3 `related` slugs.
- `searchIntent`, `audience`, `contentGoal`, `internalLinks` filled.
- `qualityStatus: "launch_ready"` before flipping to `published`.
- JSON-LD Article schema is emitted automatically by `BlogPost.tsx`.

## Readability checklist

- No paragraph longer than ~5 lines on desktop.
- No 4+ bullet lists unless the bullets are doing real work.
- Use callouts sparingly (max ~2 per post).
- Smooth transitions between sections; no abrupt headline jumps.

## Internal linking

- Every published post links to the Scorecard and Why RGS Is Different.
- The Diagnostic CTA appears once near the end, not in every section.
- The Demo link is included only when the post benefits from it.

## Publishing decision

A post is launch-ready only if all of the following are true:

- It has a clear point of view, not a "balanced overview".
- It has at least one memorable line a reader could quote back.
- It does not need a stock image to feel finished.
- The contract test (`src/lib/__tests__/blogSystemContract.test.ts`) is green.

If any of those fail, set `qualityStatus` to `draft` or `review_needed`
and either rewrite or pull from the index.