import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Demo Reset / Public Demo Swap / Launch-Ready Smoke contract.
 *
 * This is a static, no-network audit that pins the launch-critical
 * surfaces called out by the Demo Reset / Launch Smoke pass:
 *
 *  - demo seeders only ever touch synthetic suffix accounts
 *  - demo customers are clearly labeled (showcase / demo)
 *  - the public /demo page is honest (no fake proof, no remote video)
 *  - all required public routes are still registered
 *  - Google Tag remains installed in index.html
 *  - cannabis/MMJ industry slug stays dispensary-scope only
 *  - no frontend code references service-role secrets
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("Demo reset + launch-ready smoke contract", () => {
  it("demo seeders only target synthetic-suffix accounts", () => {
    const demoSeed = read("src/lib/admin/demoSeed.ts");
    const showcaseSeed = read("src/lib/admin/showcaseSeed.ts");
    expect(demoSeed).toMatch(/@demo\.rgs\.local/);
    expect(showcaseSeed).toMatch(/@showcase\.rgs\.local/);
    // Must mark accounts as is_demo_account so admin UIs can isolate them.
    expect(showcaseSeed).toMatch(/is_demo_account:\s*true/);
  });

  it("showcase seed labels every business name as demo/showcase", () => {
    const src = read("src/lib/admin/showcaseSeed.ts");
    const businessNames = Array.from(
      src.matchAll(/business_name:\s*"([^"]+)"/g),
    ).map((m) => m[1]);
    expect(businessNames.length).toBeGreaterThan(0);
    // Every literal seed business name must carry an obvious demo/showcase label.
    const seedDecls = businessNames.filter((n) => !n.includes("${"));
    for (const name of seedDecls) {
      expect(
        /(showcase|demo|sample|example)/i.test(name),
        `seed business name not labeled: ${name}`,
      ).toBe(true);
    }
  });

  it("showcase seed disables global learning contribution for demo accounts", () => {
    const src = read("src/lib/admin/showcaseSeed.ts");
    expect(src).toMatch(/learning_enabled\s*=\s*false|learning_enabled:\s*false/);
    expect(src).toMatch(
      /contributes_to_global_learning\s*=\s*false|contributes_to_global_learning:\s*false/,
    );
  });

  it("public /demo page exists with honest 'does not claim' copy", () => {
    const src = read("src/pages/Demo.tsx");
    expect(src).toMatch(/SystemDemoAnimation/);
    expect(src).toMatch(/What this demo does not claim/);
    expect(src).toMatch(/illustrative sandbox/i);
    // No remote video / iframe embeds.
    expect(/<video[^>]+src=/i.test(src)).toBe(false);
    expect(/<iframe/i.test(src)).toBe(false);
    // No fake proof markers.
    expect(/case study|testimonial|trusted by|guaranteed/i.test(src)).toBe(false);
  });

  it("all launch-critical public routes are registered in App.tsx", () => {
    const src = read("src/App.tsx");
    const required = [
      'path="/"',
      'path="/scorecard"',
      'path="/diagnostic"',
      'path="/diagnostic-apply"',
      'path="/implementation"',
      'path="/revenue-control-system"',
      'path="/why-rgs-is-different"',
      'path="/blog"',
      'path="/industries"',
      'path="/industries/:slug"',
      'path="/industry-brain"',
      'path="/privacy"',
      'path="/eula"',
      'path="/contact"',
      'path="/auth"',
      'path="/claim-invite"',
      'path="/demo"',
    ];
    for (const r of required) {
      expect(src.includes(r), `missing public route: ${r}`).toBe(true);
    }
  });

  it("all launch-critical industry landing slugs exist", () => {
    const src = read("src/lib/industries/landingContent.ts");
    for (const slug of [
      "general-business",
      "trades-field-service",
      "restaurant-food-service",
      "retail",
      "cannabis-mmj-dispensary",
    ]) {
      expect(src.includes(`slug: "${slug}"`), `missing industry slug: ${slug}`).toBe(true);
    }
  });

  it("Google Tag remains installed exactly once in index.html", () => {
    const html = read("index.html");
    expect(html).toMatch(/G-KNYS7P18GC/);
    const matches = html.match(/googletagmanager\.com\/gtag\/js/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("cannabis industry landing stays dispensary/regulated retail only", () => {
    const src = read("src/lib/industries/landingContent.ts");
    // Reject healthcare drift on the cannabis surface.
    const cannabisBlock = src.split('slug: "cannabis-mmj-dispensary"')[1] ?? "";
    expect(/HIPAA|patient care|clinical|insurance claim|medical billing/i.test(cannabisBlock)).toBe(false);
  });

  it("no frontend code references service-role secrets", () => {
    // Grep statically — guards against a future paste of admin secrets into bundle.
    const candidates = [
      "src/integrations/supabase/client.ts",
      "src/App.tsx",
      "src/pages/Demo.tsx",
      "src/pages/Index.tsx",
    ];
    for (const rel of candidates) {
      if (!existsSync(join(root, rel))) continue;
      const src = read(rel);
      expect(/SUPABASE_SERVICE_ROLE|service_role/.test(src)).toBe(false);
    }
  });

  it("demo reset / showcase delete is scoped to customer_id, never raw table wipe", () => {
    const src = read("src/lib/admin/showcaseSeed.ts");
    const deletes = Array.from(src.matchAll(/\.delete\(\)([^;]*);/g)).map((m) => m[0]);
    expect(deletes.length).toBeGreaterThan(0);
    for (const d of deletes) {
      expect(/\.eq\(/.test(d), `unscoped delete in showcase seed: ${d}`).toBe(true);
    }
  });
});
