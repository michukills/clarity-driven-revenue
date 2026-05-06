/**
 * P86B — Welcome page simplification + admin timeline command center +
 * reminder tracking. Pure deterministic logic + content guards. No
 * network. No AI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  composeGreetingLine,
  deriveReminderStatus,
  DIAGNOSTIC_TIMELINE_STEPS,
  FALLBACK_GREETING,
  findForbiddenWelcomeCopy,
  greetingForTimeZone,
  P86B_FORBIDDEN_POSITIONING_PHRASES,
  P86B_FORBIDDEN_REGULATED_CLAIMS,
  pickAdminDisplayName,
  pickClientDisplayName,
  pickGreetingFromHour,
  RGS_OPERATING_STRUCTURE_SENTENCE,
  validatePriorityActionCards,
  type PriorityActionCard,
} from "@/lib/welcomeGreeting";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("P86B — greeting logic", () => {
  it("buckets hours correctly", () => {
    expect(pickGreetingFromHour(6)).toBe("Good morning");
    expect(pickGreetingFromHour(11)).toBe("Good morning");
    expect(pickGreetingFromHour(12)).toBe("Good afternoon");
    expect(pickGreetingFromHour(16)).toBe("Good afternoon");
    expect(pickGreetingFromHour(17)).toBe("Good evening");
    expect(pickGreetingFromHour(22)).toBe("Good evening");
  });
  it("falls back when hour is unknown / out of range", () => {
    expect(pickGreetingFromHour(undefined)).toBe(FALLBACK_GREETING);
    expect(pickGreetingFromHour(null as any)).toBe(FALLBACK_GREETING);
    expect(pickGreetingFromHour(99)).toBe(FALLBACK_GREETING);
    expect(pickGreetingFromHour(-1)).toBe(FALLBACK_GREETING);
    expect(pickGreetingFromHour(2)).toBe(FALLBACK_GREETING);
  });
  it("composes greeting line and degrades gracefully without name", () => {
    expect(composeGreetingLine({ greeting: "Good morning", displayName: "Matt" }))
      .toBe("Good morning, Matt.");
    expect(composeGreetingLine({ greeting: "Good morning", displayName: "" }))
      .toBe("Good morning.");
    expect(composeGreetingLine({ displayName: null })).toBe("Welcome back.");
  });
  it("greetingForTimeZone falls back on invalid zone", () => {
    expect(greetingForTimeZone(new Date(), "Not/A/Zone")).toBe(FALLBACK_GREETING);
  });
  it("greetingForTimeZone returns a valid greeting for a known zone", () => {
    const morning = new Date("2026-05-06T14:00:00Z"); // 09:00 in NY
    const g = greetingForTimeZone(morning, "America/New_York");
    expect(g).toBe("Good morning");
  });
  it("picks client display name preferring business name", () => {
    expect(pickClientDisplayName({ business_name: "Acme", full_name: "M" })).toBe("Acme");
    expect(pickClientDisplayName({ business_name: " ", full_name: "Matt" })).toBe("Matt");
    expect(pickClientDisplayName(null)).toBe("");
  });
  it("picks admin display name from metadata or email local part", () => {
    expect(
      pickAdminDisplayName({ user_metadata: { full_name: "Matt R" }, email: "x@y.com" }),
    ).toBe("Matt R");
    expect(pickAdminDisplayName({ email: "matt.rgs@example.com" })).toBe("Matt Rgs");
    expect(pickAdminDisplayName({})).toBe("");
  });
});

describe("P86B — reminder status", () => {
  const now = new Date("2026-05-06T12:00:00Z");
  it("returns completed when completedAt set", () => {
    expect(
      deriveReminderStatus({ dueAt: now, completedAt: now, now }),
    ).toBe("completed");
  });
  it("returns overdue for past due", () => {
    expect(
      deriveReminderStatus({
        dueAt: new Date(now.getTime() - 86400_000),
        now,
      }),
    ).toBe("overdue");
  });
  it("returns due within 24h", () => {
    expect(
      deriveReminderStatus({
        dueAt: new Date(now.getTime() + 60 * 60 * 1000),
        now,
      }),
    ).toBe("due");
  });
  it("returns scheduled for far-future", () => {
    expect(
      deriveReminderStatus({
        dueAt: new Date(now.getTime() + 5 * 86400_000),
        now,
      }),
    ).toBe("scheduled");
  });
  it("returns scheduled when no dueAt", () => {
    expect(deriveReminderStatus({ now })).toBe("scheduled");
  });
});

describe("P86B — priority action card validation", () => {
  it("flags non-disabled cards with no real route", () => {
    const cards: PriorityActionCard[] = [
      { key: "x", title: "Bad", body: "b", status: "ready", href: "#" },
    ];
    const v = validatePriorityActionCards(cards);
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/x/);
  });
  it("requires a reason for disabled cards", () => {
    const cards: PriorityActionCard[] = [
      { key: "y", title: "Locked", body: "b", status: "disabled" },
    ];
    expect(validatePriorityActionCards(cards).ok).toBe(false);
  });
  it("accepts well-formed cards", () => {
    const cards: PriorityActionCard[] = [
      { key: "ev", title: "Upload evidence", body: "...", status: "ready", href: "/portal/uploads" },
      {
        key: "rcs",
        title: "RGS Control System",
        body: "...",
        status: "disabled",
        disabledReason: "Available after diagnostic completion.",
      },
    ];
    const v = validatePriorityActionCards(cards);
    expect(v.ok).toBe(true);
  });
});

describe("P86B — diagnostic timeline registry", () => {
  it("contains the 6 standard steps in order", () => {
    expect(DIAGNOSTIC_TIMELINE_STEPS.map((s) => s.day)).toEqual([1, 2, 4, 6, 8, 10]);
    const titles = DIAGNOSTIC_TIMELINE_STEPS.map((s) => s.title.toLowerCase());
    expect(titles[0]).toContain("systems interview");
    expect(titles[5]).toContain("repair map");
  });
  it("describes reminders honestly (admin-tracked, not auto-sent)", () => {
    const reminderStep = DIAGNOSTIC_TIMELINE_STEPS.find((s) => s.key === "evidence_reminder")!;
    expect(reminderStep.body).toMatch(/admin-tracked|RGS team/i);
    expect(reminderStep.body).not.toMatch(/automatically sent|auto-sent/i);
  });
});

describe("P86B — copy safety", () => {
  const FILES = [
    "src/components/portal/TimeAwareWelcomeHeader.tsx",
    "src/components/portal/PriorityActionCardGrid.tsx",
    "src/components/portal/DiagnosticTimelinePanel.tsx",
    "src/components/portal/ClientTimelineRemindersList.tsx",
    "src/components/admin/AdminTimelineCommandCenter.tsx",
    "src/lib/welcomeGreeting/index.ts",
  ];
  it("contains no banned positioning phrases", () => {
    for (const f of FILES) {
      const src = read(f);
      // Strip the FORBIDDEN regex declarations so we don't false-positive
      // on the welcomeGreeting registry that intentionally lists them.
      const cleaned = src.replace(/P86B_FORBIDDEN_[A-Z_]+[\s\S]*?\];/g, "");
      const hits = findForbiddenWelcomeCopy(cleaned);
      expect(hits, `forbidden phrase in ${f}: ${hits.join(", ")}`).toEqual([]);
    }
  });
  it("approved positioning sentence is present in greeting registry", () => {
    expect(RGS_OPERATING_STRUCTURE_SENTENCE).toMatch(/operating structure owners use/i);
  });
  it("forbidden registries list the exact banned phrases", () => {
    const positioning = P86B_FORBIDDEN_POSITIONING_PHRASES.map((r) => r.source.toLowerCase());
    const layFrag = "lay the " + "bricks";
    const mirrorFrag = "mirror, not " + "the map";
    expect(positioning.some((s) => s.includes(layFrag))).toBe(true);
    expect(positioning.some((s) => s.includes(mirrorFrag))).toBe(true);
    const regulated = P86B_FORBIDDEN_REGULATED_CLAIMS.map((r) => r.source.toLowerCase());
    expect(regulated.some((s) => s.includes("lender-ready"))).toBe(true);
  });
});

describe("P86B — reminder migration shape", () => {
  it("ships a migration that creates the reminders table with admin_notes column and client RPC", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const dir = path.resolve(process.cwd(), "supabase/migrations");
    const files = fs.readdirSync(dir);
    const match = files
      .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
      .find((sql) => sql.toLowerCase().includes("rgs_timeline_reminders"));
    expect(match, "expected a migration that defines rgs_timeline_reminders").toBeTruthy();
    const lower = match!.toLowerCase();
    expect(lower).toContain("enable row level security");
    expect(lower).toContain("admin_notes");
    expect(lower).toContain("client_visible");
    expect(lower).toContain("get_client_timeline_reminders");
    // Client RPC must not return admin_notes.
    const rpcSection = match!.split("get_client_timeline_reminders")[1] || "";
    expect(rpcSection.toLowerCase()).not.toContain("admin_notes");
    // Admin policy is gated by has_role(admin).
    expect(lower).toContain("has_role(auth.uid(), 'admin'");
  });
});