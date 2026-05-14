import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildDeterministicGuideAnswer,
  buildGuideResponse,
  findForbiddenGuideClaims,
  getGuideBotActions,
  getImageAssistWarnings,
  inferGuideSurface,
  isRouteSafeForSurface,
} from "@/lib/guideBots/p94aGuideBotPolicy";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("P94A guide bot policy", () => {
  it("infers public, client, and admin surfaces from route and role", () => {
    expect(inferGuideSurface("/scorecard")).toBe("public");
    expect(inferGuideSurface("/portal/tools")).toBe("client");
    expect(inferGuideSurface("/admin/customers")).toBe("admin");
    expect(inferGuideSurface("/portal/tools", true)).toBe("admin");
  });

  it("public bot routes only to public pages", () => {
    const actions = getGuideBotActions("public", "/", "How do I take the scorecard?");
    expect(actions[0].href).toBe("/scorecard");
    expect(actions.every((action) => isRouteSafeForSurface(action, "public"))).toBe(true);
    expect(actions.map((a) => a.href).join(" ")).not.toMatch(/\/admin|\/portal/);
  });

  it("client bot routes only to portal-safe pages", () => {
    const actions = getGuideBotActions("client", "/portal", "Where do I upload evidence?");
    expect(actions[0].href).toBe("/portal/uploads");
    expect(actions.every((action) => isRouteSafeForSurface(action, "client"))).toBe(true);
  });

  it("admin bot routes only to admin-safe pages", () => {
    const actions = getGuideBotActions("admin", "/admin", "approve pending signup");
    expect(actions[0].href).toBe("/admin/pending-accounts");
    expect(actions.every((action) => isRouteSafeForSurface(action, "admin"))).toBe(true);
  });

  it("can explain Scorecard vs Diagnostic without guarantees or professional-advice claims", () => {
    const scorecard = buildDeterministicGuideAnswer("public", "What is the scorecard?");
    const diagnostic = buildDeterministicGuideAnswer("public", "How is the paid Diagnostic different?");
    expect(scorecard).toContain("first-pass stability check");
    expect(scorecard).toContain("Demand Generation");
    expect(scorecard).toContain("Owner Independence");
    expect(diagnostic).toContain("goes deeper than the public Scorecard");
    expect(findForbiddenGuideClaims(`${scorecard}\n${diagnostic}`)).toHaveLength(0);
  });

  it("client guidance cannot claim admin notes or final findings", () => {
    const response = buildGuideResponse(
      "client",
      "/portal/uploads",
      buildDeterministicGuideAnswer("client", "what do I upload?", {
        route: "/portal/uploads",
        surface: "client",
        stageLabel: "evidence needed",
      }),
      "deterministic",
    );
    expect(response.answer).toMatch(/reviewed before they become official findings/i);
    expect(response.boundaries.join(" ")).toMatch(/Admin notes.*not available/i);
    expect(response.draftOnly).toBe(true);
    expect(response.aiAssisted).toBe(false);
  });

  it("admin guidance cannot perform write actions or override deterministic scoring", () => {
    const response = buildGuideResponse("admin", "/admin/report-drafts", "Publish this report", "ai_backed");
    const text = `${response.answer} ${response.boundaries.join(" ")}`;
    expect(text).toMatch(/cannot approve, publish, send, delete, or change scores/i);
    expect(text).toMatch(/Deterministic scoring/i);
    expect(response.draftOnly).toBe(true);
  });

  it("sanitizes unsafe generated answers back into bounded guidance", () => {
    const response = buildGuideResponse(
      "public",
      "/",
      "RGS guarantees revenue growth and gives legal advice.",
      "ai_backed",
    );
    expect(response.answer).toContain("I need to keep this inside RGS boundaries.");
    expect(findForbiddenGuideClaims(response.answer)).toHaveLength(0);
  });

  it("image/document warnings require confirmation and forbid certification", () => {
    const warnings = getImageAssistWarnings("image/png").join(" ");
    expect(warnings).toMatch(/draft only/i);
    expect(warnings).toMatch(/Confirm or edit/i);
    expect(warnings).toMatch(/does not verify evidence/i);
    expect(warnings).toMatch(/legal, tax, accounting, compliance, valuation/i);
  });
});

describe("P94A edge function and UI contracts", () => {
  const guideFn = read("supabase/functions/rgs-guide-bot/index.ts");
  const imageFn = read("supabase/functions/rgs-image-input-assist/index.ts");
  const config = read("supabase/config.toml");
  const ui = read("src/components/guideBot/RgsGuideBot.tsx");

  it("registers public guide and authenticated image assist with correct JWT posture", () => {
    expect(config).toMatch(/\[functions\.rgs-guide-bot\][\s\S]*?verify_jwt = false/);
    expect(config).toMatch(/\[functions\.rgs-image-input-assist\][\s\S]*?verify_jwt = true/);
  });

  it("keeps AI calls backend-only and logs attempts without frontend secrets", () => {
    const backendKeyRead = 'Deno.env.get("LOVABLE' + '_API_KEY")';
    expect(guideFn).toContain(backendKeyRead);
    expect(imageFn).toContain(backendKeyRead);
    expect(guideFn).toContain(".from(\"ai_run_logs\")");
    expect(imageFn).toContain(".from(\"ai_run_logs\")");

    const frontendFiles = walk(resolve(root, "src")).filter((file) => !file.includes("__tests__"));
    const forbiddenFrontendSecretReads = new RegExp(
      [
        String.raw`Deno\.env\.get\(["']LOVABLE`,
        String.raw`_API_KEY["']\)`,
        String.raw`|import\.meta\.env\.[A-Z_]*LOVABLE`,
        String.raw`_API_KEY`,
        String.raw`|ai\.gateway\.lovable\.dev`,
      ].join(""),
    );
    const offenders = frontendFiles.filter((file) => {
      const src = readFileSync(file, "utf8");
      return forbiddenFrontendSecretReads.test(src);
    });
    expect(offenders, offenders.join(", ")).toHaveLength(0);
  });

  it("public function does not load customer tables for public context", () => {
    const publicReturn = guideFn.indexOf('if (surface === "public") return context;');
    const firstCustomerRead = guideFn.indexOf(".from(\"customers\")");
    expect(publicReturn).toBeGreaterThan(-1);
    expect(firstCustomerRead).toBeGreaterThan(publicReturn);
  });

  it("client context verifies ownership and does not select admin-only notes", () => {
    expect(guideFn).toMatch(/customer\.user_id !== user\.userId/);
    const clientSelectStart = guideFn.indexOf('select("id,business_name,full_name,email,stage,lifecycle_state,status,account_kind,is_demo_account,user_id")');
    expect(clientSelectStart).toBeGreaterThan(-1);
    const clientBlock = guideFn.slice(clientSelectStart, guideFn.indexOf("context.accountLabel", clientSelectStart));
    expect(clientBlock).not.toMatch(/admin_notes|lifecycle_notes|account_kind_notes|billing_notes/);
  });

  it("image assist never writes extracted fields automatically", () => {
    expect(imageFn).toContain("requiresConfirmationBeforeWrite: true");
    expect(imageFn).toContain("verified: false");
    expect(imageFn).toContain('write_actions: "none"');
    expect(imageFn).not.toMatch(/\.from\("(customers|customer_uploads|evidence_records|report_drafts)"\)\.(insert|update|upsert|delete)\(/);
  });

  it("UI is collapsed as a sticky bottom-right text bar before interaction", () => {
    expect(ui).toContain("fixed bottom-3 left-3 right-3");
    expect(ui).toContain("sm:right-5");
    expect(ui).toContain("data-testid=\"p94a-guide-collapsed-bar\"");
    expect(ui).toContain("{placeholder}");
    expect(ui).toContain("setOpen(true)");
    expect(ui).toContain("max-h-[78vh]");
    expect(ui).toContain("[overflow-wrap:anywhere]");
  });

  it("UI labels extraction as AI-assisted draft and requires confirmation before use", () => {
    expect(ui).toContain("AI-assisted draft, not verified");
    expect(ui).toContain("Confirm draft into guide input");
    expect(ui).toContain("Nothing was written to the database.");
    expect(ui).not.toMatch(/supabase\.from\([^)]*\)\.(insert|update|upsert|delete)/);
  });

  it("App mounts the guide globally inside the authenticated router shell", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('import RgsGuideBot from "./components/guideBot/RgsGuideBot"');
    expect(app).toContain("<RgsGuideBot />");
  });
});
