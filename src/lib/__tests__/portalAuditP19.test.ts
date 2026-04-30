import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * P19 — Portal audit wiring + helper hardening regression guards.
 *
 * Pure-static checks against the application source tree plus a small
 * runtime check on the helper itself (sanitizer + retry).
 */

const root = process.cwd();

function read(p: string) {
  return readFileSync(join(root, p), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const ALL_ACTIONS = [
  "report_generated",
  "report_viewed",
  "task_assigned",
  "task_status_changed",
  "file_uploaded",
  "file_deleted",
  "connector_connected",
  "connector_disconnected",
  "data_import_started",
  "data_import_completed",
  "admin_note_created",
  "admin_note_edited",
  "ai_recommendation_generated",
  "client_record_updated",
] as const;

const srcFiles = walk(join(root, "src")).filter(
  (f) => !/__tests__|integrations\/supabase\/types\.ts$/.test(f),
);
const allSrc = srcFiles.map((f) => ({ f, text: read(f.replace(root + "/", "")) }));

describe("P19 — every PortalAuditAction has a wired call-site or explicit TODO", () => {
  for (const action of ALL_ACTIONS) {
    it(`${action} is wired or explicitly deferred`, () => {
      const callRe = new RegExp(`logPortalAudit\\(\\s*"${action}"`);
      const todoRe = new RegExp(`TODO\\(P19 audit\\)[^\\n]*${action}`);
      const wired = allSrc.some(({ text }) => callRe.test(text));
      const todoed = allSrc.some(({ text }) => todoRe.test(text));
      expect(wired || todoed, `no call-site or TODO for ${action}`).toBe(true);
    });
  }
});

const TOKEN_KEY_RE =
  /\b(access_?token|refresh_?token|api_?key|ciphertext|authorization|oauth_code|secret)\b/i;

function extractCallObjectArgs(text: string, action: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`logPortalAudit\\(\\s*"${action}"[\\s\\S]*?\\)\\s*;`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

describe("P19 — no call-site forwards token/secret-shaped keys", () => {
  it("no logPortalAudit invocation includes denylisted keys", () => {
    const offenders: string[] = [];
    for (const { f, text } of allSrc) {
      const re = /logPortalAudit\([\s\S]*?\)\s*;/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (TOKEN_KEY_RE.test(m[0])) offenders.push(`${f}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("P19 — sensitive payload constraints per event", () => {
  function payloadKeysForAction(action: string): string[] {
    const keys: string[] = [];
    for (const { text } of allSrc) {
      for (const call of extractCallObjectArgs(text, action)) {
        // crude but effective: collect identifiers that look like object keys
        const objMatch = call.match(/\{([\s\S]*)\}/);
        if (!objMatch) continue;
        const body = objMatch[1];
        const keyRe = /(?:^|[\s,{])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
        let km: RegExpExecArray | null;
        while ((km = keyRe.exec(body))) keys.push(km[1]);
      }
    }
    return keys;
  }

  it("report_generated/report_viewed never pass body/content fields", () => {
    const keys = [
      ...payloadKeysForAction("report_generated"),
      ...payloadKeysForAction("report_viewed"),
    ];
    expect(keys).not.toContain("report_data");
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("client_notes");
    expect(keys).not.toContain("internal_notes");
  });

  it("admin_note_created/admin_note_edited never pass note content", () => {
    const keys = [
      ...payloadKeysForAction("admin_note_created"),
      ...payloadKeysForAction("admin_note_edited"),
    ];
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("note");
    expect(keys).not.toContain("text");
  });

  it("ai_recommendation_generated never passes prompt/response/message/content", () => {
    const keys = payloadKeysForAction("ai_recommendation_generated");
    expect(keys).not.toContain("prompt");
    expect(keys).not.toContain("response");
    expect(keys).not.toContain("message");
    expect(keys).not.toContain("messages");
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("rationale");
  });

  it("connector events never pass tokens/codes/realm secrets/payloads", () => {
    const keys = [
      ...payloadKeysForAction("connector_connected"),
      ...payloadKeysForAction("connector_disconnected"),
    ];
    for (const banned of [
      "access_token",
      "refresh_token",
      "token",
      "api_key",
      "oauth_code",
      "code",
      "realm_secret",
      "payload",
      "metadata",
    ]) {
      expect(keys).not.toContain(banned);
    }
  });

  it("data import events never pass raw rows / transactions / financial lines", () => {
    const keys = [
      ...payloadKeysForAction("data_import_started"),
      ...payloadKeysForAction("data_import_completed"),
    ];
    for (const banned of [
      "rows",
      "raw_rows",
      "transactions",
      "lines",
      "items",
      "payload",
      "data",
      "records",
    ]) {
      expect(keys).not.toContain(banned);
    }
  });

  it("client_record_updated never passes before/after object", () => {
    const keys = payloadKeysForAction("client_record_updated");
    for (const banned of ["before", "after", "old", "new", "values", "row"]) {
      expect(keys).not.toContain(banned);
    }
  });
});

describe("P19 — helper hardening", () => {
  it("helper source declares retry logic", () => {
    const src = read("src/lib/portalAudit.ts");
    expect(src).toMatch(/attempt\s*<=\s*2/);
    expect(src).toMatch(/setTimeout/);
  });

  it("helper source declares the denylist sanitizer", () => {
    const src = read("src/lib/portalAudit.ts");
    expect(src).toMatch(/sanitizeAuditDetails/);
    expect(src).toMatch(/DENYLIST/);
    expect(src).toMatch(/access_token/);
    expect(src).toMatch(/refresh_token/);
    expect(src).toMatch(/oauth_code/);
  });

  it("sanitizer removes denylisted keys at any depth", async () => {
    const { sanitizeAuditDetails } = await import("@/lib/portalAudit");
    const out = sanitizeAuditDetails({
      report_id: "abc",
      access_token: "xxx",
      refreshToken: "yyy",
      token: "zzz",
      nested: {
        ok: true,
        api_key: "k",
        deeper: { ciphertext: "c", keep: 1 },
      },
      list: [{ secret: "s", keep: 2 }, "literal"],
    });
    expect(out).toEqual({
      report_id: "abc",
      nested: { ok: true, deeper: { keep: 1 } },
      list: [{ keep: 2 }, "literal"],
    });
  });

  it("retries once on transient failure then logs a warning", async () => {
    vi.resetModules();
    const calls: number[] = [];
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        rpc: vi.fn(async () => {
          calls.push(Date.now());
          return { error: { message: "transient" } };
        }),
      },
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("@/lib/portalAudit");
    await mod.logPortalAudit("connector_connected", "cust-1", { connector: "QuickBooks" });
    expect(calls.length).toBe(2);
    expect(warn).toHaveBeenCalled();
    const msg = String(warn.mock.calls[0][0] ?? "");
    expect(msg).toContain("connector_connected");
    expect(msg).toContain("[critical]");
    warn.mockRestore();
    vi.doUnmock("@/integrations/supabase/client");
    vi.resetModules();
  });

  it("succeeds without retry when first call returns no error", async () => {
    vi.resetModules();
    let count = 0;
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        rpc: vi.fn(async () => {
          count++;
          return { error: null };
        }),
      },
    }));
    const mod = await import("@/lib/portalAudit");
    await mod.logPortalAudit("file_uploaded", "cust-1", { file_name: "x" });
    expect(count).toBe(1);
    vi.doUnmock("@/integrations/supabase/client");
    vi.resetModules();
  });

  it("never throws when customerId is null/undefined and never calls rpc", async () => {
    vi.resetModules();
    const rpc = vi.fn(async () => ({ error: null }));
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
    const mod = await import("@/lib/portalAudit");
    await expect(
      mod.logPortalAudit("file_uploaded", null, { file_name: "x" }),
    ).resolves.toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
    vi.doUnmock("@/integrations/supabase/client");
    vi.resetModules();
  });
});

beforeEach(() => {
  vi.restoreAllMocks();
});