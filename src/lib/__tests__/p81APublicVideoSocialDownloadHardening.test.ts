/**
 * P81A — Final Public Video Asset + Social Share + Download
 * Functionality Hardening.
 *
 * Source-level contracts that lock in:
 *   - the public video registry exists, separate from the portal
 *     walkthrough registry, and is honest about which videos are
 *     finished and which are not
 *   - public video components only render real playable / downloadable
 *     videos when a real asset exists
 *   - portal walkthrough videos remain instructional only — no
 *     download, no social share, ever
 *   - public share utility encodes URLs correctly and points at public
 *     pages, never at raw video files or private storage paths
 *   - Open Graph / Twitter metadata uses public-safe assets only and
 *     never advertises an `og:video` asset that does not exist
 *   - footer social links reach the real Facebook/Instagram accounts
 *   - platform-limitation truth language exists in admin/help copy
 *   - banned positioning wording is still absent everywhere
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  PUBLIC_VIDEO_ASSETS,
  PUBLIC_SOCIAL_LINKS,
  PUBLIC_SHARE_PLATFORM_NOTE,
  buildPublicShareTargets,
  isPublicVideoDownloadable,
  isPublicVideoOgEligible,
  isPublicVideoPlayable,
} from "@/config/publicVideoAssets";
import { TOOL_WALKTHROUGH_VIDEO_REGISTRY } from "@/config/toolWalkthroughVideos";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

// ── 1. Registry shape and honest status ────────────────────────────
describe("P81A — public video registry", () => {
  it("registry file exists and exports at least one entry", () => {
    expect(existsSync(resolve(ROOT, "src/config/publicVideoAssets.ts"))).toBe(true);
    expect(Array.isArray(PUBLIC_VIDEO_ASSETS)).toBe(true);
    expect(PUBLIC_VIDEO_ASSETS.length).toBeGreaterThan(0);
  });

  it("every entry has a recognized honest video_status", () => {
    const allowed = new Set([
      "finished","script_needed","recording_needed","editing_needed","planned","not_available",
    ]);
    for (const v of PUBLIC_VIDEO_ASSETS) {
      expect(allowed.has(v.video_status), `bad status: ${v.video_key}`).toBe(true);
    }
  });

  it("finished videos that expose a remote file have a real video_url", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      if (v.video_status === "finished" && (v.allow_download || v.og_video_allowed)) {
        expect(v.video_url, `${v.video_key} finished+downloadable/og must have video_url`).toBeTruthy();
      }
    }
  });

  it("download-enabled entries require a real download_url and finished status", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      if (v.allow_download) {
        expect(v.video_status, `${v.video_key} allow_download requires finished`).toBe("finished");
        expect(v.download_url, `${v.video_key} allow_download requires download_url`).toBeTruthy();
      }
      // The honest-flag helpers must agree.
      expect(isPublicVideoDownloadable(v)).toBe(
        v.allow_download && v.video_status === "finished" && !!v.download_url,
      );
    }
  });

  it("og:video entries require a real, finished, public-safe video_url", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      if (v.og_video_allowed) {
        expect(v.video_status).toBe("finished");
        expect(v.video_url).toBeTruthy();
      }
      expect(isPublicVideoOgEligible(v)).toBe(
        v.og_video_allowed && v.video_status === "finished" && !!v.video_url,
      );
    }
  });

  it("CTA URL is always a public route, never a raw private storage path", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      expect(v.scorecard_cta_url.startsWith("/")).toBe(true);
      expect(/storage|signed|supabase\.co|amazonaws/i.test(v.scorecard_cta_url)).toBe(false);
    }
  });

  it("isPublicVideoPlayable only returns true for finished entries with a video_url", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      expect(isPublicVideoPlayable(v)).toBe(v.video_status === "finished" && !!v.video_url);
    }
  });
});

// ── 2. Public share utility correctness ────────────────────────────
describe("P81A — public share utility", () => {
  const targets = buildPublicShareTargets({
    pageUrl: "https://www.revenueandgrowthsystems.com/demo",
    shareText:
      "See how stable your business really is — take the RGS Business Stability Scorecard™ at https://www.revenueandgrowthsystems.com/scorecard",
  });

  it("Facebook share URL is correctly encoded and points to the public page", () => {
    expect(targets.facebook).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    expect(targets.facebook).toContain(encodeURIComponent("https://www.revenueandgrowthsystems.com/demo"));
  });

  it("LinkedIn share URL is correctly encoded and points to the public page", () => {
    expect(targets.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
    expect(targets.linkedin).toContain(encodeURIComponent("https://www.revenueandgrowthsystems.com/demo"));
  });

  it("X/Twitter share URL includes both text and url params, encoded", () => {
    expect(targets.twitter).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
    expect(targets.twitter).toContain("&url=");
    expect(targets.twitter).toContain(encodeURIComponent("https://www.revenueandgrowthsystems.com/demo"));
  });

  it("share text routinely includes the scorecard CTA path for honest CTA wiring", () => {
    expect(targets.twitter).toContain(encodeURIComponent("/scorecard"));
  });

  it("no share URL points to a raw video file or private storage path", () => {
    for (const url of Object.values(targets)) {
      expect(/\.mp4(\?|$)/i.test(url)).toBe(false);
      expect(/storage\.googleapis|supabase\.co\/storage|amazonaws/i.test(url)).toBe(false);
    }
  });
});

// ── 3. Portal walkthroughs stay no-download / no-social-share ─────
describe("P81A — portal walkthrough videos remain instructional only", () => {
  it("every portal walkthrough entry locks no_download:true and no_social_share:true", () => {
    for (const w of TOOL_WALKTHROUGH_VIDEO_REGISTRY) {
      expect(w.no_download).toBe(true);
      expect(w.no_social_share).toBe(true);
    }
  });

  it("portal video keys do not appear in the public video registry", () => {
    const portalKeys = new Set(TOOL_WALKTHROUGH_VIDEO_REGISTRY.map((w) => w.tool_key));
    for (const v of PUBLIC_VIDEO_ASSETS) {
      expect(portalKeys.has(v.video_key)).toBe(false);
    }
  });

  it("ToolWalkthroughCard renders no download attribute and no share UI", () => {
    const src = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(/\bdownload\b\s*=/.test(src)).toBe(false);
    expect(/navigator\.share/.test(src)).toBe(false);
    expect(/facebook\.com\/sharer|twitter\.com\/intent|linkedin\.com\/sharing/i.test(src)).toBe(false);
  });
});

// ── 4. Demo page does not present a fake playable / downloadable video
describe("P81A — /demo public video honesty", () => {
  const demo = read("src/pages/Demo.tsx");

  it("never wires a real-but-fake <video src> URL for an unfinished walkthrough", () => {
    // Spec: the file uses `WALKTHROUGH_VIDEO_SRC: string | null = null`
    // so the placeholder card renders instead of a fake player.
    expect(/WALKTHROUGH_VIDEO_SRC\s*:\s*string\s*\|\s*null\s*=\s*null/.test(demo)).toBe(true);
  });

  it("never advertises a download button on the demo page", () => {
    expect(/download(?:Url|video|Video)/.test(demo)).toBe(false);
    expect(/<a[^>]*\bdownload\b/.test(demo)).toBe(false);
  });

  it("does not embed a remote <iframe> player on /demo", () => {
    expect(/<iframe\b/i.test(demo)).toBe(false);
  });

  it("share row exists and does not link directly to a raw .mp4", () => {
    const share = read("src/components/demo/ShareDemoRow.tsx");
    expect(/facebook\.com\/sharer/.test(share)).toBe(true);
    expect(/linkedin\.com\/sharing/.test(share)).toBe(true);
    expect(/twitter\.com\/intent/.test(share)).toBe(true);
    expect(/\.mp4/i.test(share)).toBe(false);
  });
});

// ── 5. Open Graph / Twitter metadata is safe ───────────────────────
describe("P81A — Open Graph / Twitter metadata safety", () => {
  const indexHtml = read("index.html");

  it("required OG/Twitter base tags exist", () => {
    for (const re of [
      /property="og:type"/,
      /property="og:image"/,
      /property="og:title"/,
      /property="og:description"/,
      /name="twitter:card"/,
      /name="twitter:image"/,
      /name="twitter:title"/,
      /name="twitter:description"/,
    ]) {
      expect(re.test(indexHtml), `missing meta: ${re}`).toBe(true);
    }
  });

  it("no og:video metadata is emitted unless a finished public video exists", () => {
    const hasOgVideoTag = /property="og:video/.test(indexHtml);
    const ogEligible = PUBLIC_VIDEO_ASSETS.some(isPublicVideoOgEligible);
    if (hasOgVideoTag) {
      expect(ogEligible, "og:video tag emitted but no finished public video exists").toBe(true);
    } else {
      // No og:video tag is the safe, honest default for now.
      expect(hasOgVideoTag).toBe(false);
    }
  });

  it("no portal/admin URL appears in public OG metadata", () => {
    expect(/\/portal\b/i.test(indexHtml)).toBe(false);
    expect(/\/admin\b/i.test(indexHtml)).toBe(false);
  });

  it("SEO component keeps canonical/OG wired to the public origin", () => {
    const seo = read("src/components/SEO.tsx");
    expect(/SITE_ORIGIN\s*=\s*"https:\/\/www\.revenueandgrowthsystems\.com"/.test(seo)).toBe(true);
    expect(/og:url/.test(seo)).toBe(true);
    expect(/canonical/.test(seo)).toBe(true);
  });
});

// ── 6. Footer social links + platform-limitation truth ────────────
describe("P81A — footer social links + platform truth", () => {
  const footer = read("src/components/Footer.tsx");

  it("Facebook link matches the canonical RGS account", () => {
    expect(footer).toContain(PUBLIC_SOCIAL_LINKS.facebook);
  });

  it("Instagram link points to the canonical RGS account", () => {
    expect(footer).toMatch(/instagram\.com\/revenueandgrowthsystems/);
  });

  it("platform-limitation truth note exists in the registry/admin copy", () => {
    expect(PUBLIC_SHARE_PLATFORM_NOTE).toMatch(/share the public page/i);
    expect(PUBLIC_SHARE_PLATFORM_NOTE).toMatch(/upload the video directly/i);
  });
});

// ── 7. No fake live-sync / unsafe / banned positioning regression ─
describe("P81A — language hygiene", () => {
  const FILES = [
    "src/config/publicVideoAssets.ts",
    "src/components/demo/ShareDemoRow.tsx",
  ].map((rel) => read(rel)).join("\n\n");

  it("no fake live-sync / connector claims in P81A surfaces", () => {
    expect(/\blive[- ]?sync(?:ed|ing)?\b/i.test(FILES)).toBe(false);
    expect(/\breal[- ]?time\b/i.test(FILES)).toBe(false);
  });

  it("no banned positioning phrases in P81A surfaces", () => {
    for (const phrase of [
      "lay the bricks",
      "provides the blueprint",
      "Mirror, Not the Map",
    ]) {
      expect(FILES.includes(phrase), `banned: ${phrase}`).toBe(false);
    }
  });

  it("no unsafe legal/tax/compliance/fiduciary/valuation claim in registry copy", () => {
    for (const re of [
      /\bguaranteed (revenue|growth|results?|roi|compliance|outcome)\b/i,
      /\blegal advice\b/i,
      /\btax advice\b/i,
      /\bfiduciary\b/i,
      /\bcompliance certif/i,
    ]) {
      expect(re.test(FILES)).toBe(false);
    }
  });
});

// ── 8. Bundle hygiene — public registry stays out of admin/IP files
describe("P81A — public registry isolation", () => {
  it("admin AI brain / standalone runner / access audit do not import publicVideoAssets", () => {
    const sensitive = [
      "src/config/rgsAiBrains.ts",
      "src/lib/standaloneToolRunner.ts",
      "src/config/clientToolAccessAudit.ts",
    ];
    for (const rel of sensitive) {
      if (!existsSync(resolve(ROOT, rel))) continue;
      const src = read(rel);
      expect(src.includes("publicVideoAssets")).toBe(false);
    }
  });

  it("publicVideoAssets does not import portal or admin modules", () => {
    const src = read("src/config/publicVideoAssets.ts");
    expect(/from\s+["']@\/pages\/(portal|admin)/.test(src)).toBe(false);
    expect(/from\s+["']@\/components\/(portal|admin)/.test(src)).toBe(false);
    expect(/integrations\/supabase/.test(src)).toBe(false);
  });

  it("publicVideoAssets contains no API keys, secrets, or backend env refs", () => {
    const src = read("src/config/publicVideoAssets.ts");
    expect(/sk_live|sk_test|API_KEY|Deno\.env|process\.env\.[A-Z_]+_KEY/i.test(src)).toBe(false);
  });
});

// ── 9. Public/portal video registries are mutually distinct ───────
describe("P81A — registry separation", () => {
  it("public registry imports nothing from the portal walkthrough registry", () => {
    const src = read("src/config/publicVideoAssets.ts");
    expect(src.includes("toolWalkthroughVideos")).toBe(false);
  });

  it("public registry never marks an entry as portal-walkthrough", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      expect(/walkthrough_card|portal_only/i.test(JSON.stringify(v))).toBe(false);
    }
  });
});

// ── 10. P81A skip-list audit (defensive — does not touch P75A list)
describe("P81A — historical regressions remain installed", () => {
  it("recent regression suites still exist on disk", () => {
    const required = [
      "src/lib/__tests__/p78GuidedLandingWalkthroughRegistry.test.ts",
      "src/lib/__tests__/p79ClientToolAccessAudit.test.ts",
      "src/lib/__tests__/p80IpHardeningVerification.test.ts",
      "src/lib/__tests__/p81FinalMobileAccessibilityVisualSweep.test.ts",
    ];
    for (const rel of required) {
      expect(existsSync(resolve(ROOT, rel)), `missing: ${rel}`).toBe(true);
    }
  });
});

// keep `walk` referenced even if not used in this file
void walk;