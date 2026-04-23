import { describe, it, expect } from "vitest";
import {
  computeWeeklyCadence,
  computeMonthlyCadence,
  normalizeEntryDates,
  cadenceBadgeLabel,
} from "./cadence";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Pin a Wednesday so day-of-week math is deterministic.
const wednesday = new Date(2026, 3, 15); // Wed Apr 15 2026
// Pin a Sunday (overdue weekly threshold).
const sunday = new Date(2026, 3, 19);
// Pin mid-month and end-of-month for monthly tests.
const midMonth = new Date(2026, 3, 17);
const endMonth = new Date(2026, 3, 27);

describe("cadence — weekly", () => {
  it("missing_baseline when no entries", () => {
    const s = computeWeeklyCadence([], wednesday);
    expect(s.status).toBe("missing_baseline");
    expect(s.hasBaseline).toBe(false);
    expect(s.tone).toBe("critical");
  });

  it("current when an entry covers this week", () => {
    const monday = addDays(wednesday, -2);
    const s = computeWeeklyCadence([iso(monday)], wednesday);
    expect(s.status).toBe("current");
    expect(s.coversCurrentPeriod).toBe(true);
  });

  it("due_soon on Friday-ish (day 5–6) with no current week entry", () => {
    const friday = new Date(2026, 3, 17); // Fri
    const lastWeekTuesday = addDays(friday, -10);
    const s = computeWeeklyCadence([iso(lastWeekTuesday)], friday);
    expect(s.status).toBe("due_soon");
  });

  it("overdue on Sunday with no current-week entry", () => {
    const lastWeekTuesday = addDays(sunday, -12);
    const s = computeWeeklyCadence([iso(lastWeekTuesday)], sunday);
    expect(s.status).toBe("overdue");
  });

  it("stale when last entry is 14+ days ago and not yet due-soon", () => {
    const old = addDays(wednesday, -30);
    const s = computeWeeklyCadence([iso(old)], wednesday);
    expect(s.status).toBe("stale");
  });
});

describe("cadence — monthly", () => {
  it("missing_baseline with no entries", () => {
    const s = computeMonthlyCadence([], wednesday);
    expect(s.status).toBe("missing_baseline");
  });

  it("current when an entry exists in the current month", () => {
    const earlyThisMonth = new Date(2026, 3, 3);
    const s = computeMonthlyCadence([iso(earlyThisMonth)], wednesday);
    expect(s.status).toBe("current");
  });

  it("due_soon mid-month if no current-month entry", () => {
    const lastMonth = new Date(2026, 2, 20);
    const s = computeMonthlyCadence([iso(lastMonth)], midMonth);
    expect(s.status).toBe("due_soon");
  });

  it("overdue late month if no current-month entry", () => {
    const lastMonth = new Date(2026, 2, 20);
    const s = computeMonthlyCadence([iso(lastMonth)], endMonth);
    expect(s.status).toBe("overdue");
  });

  it("stale after 60+ days with no recent entry", () => {
    const old = new Date(2026, 0, 5);
    const s = computeMonthlyCadence([iso(old)], new Date(2026, 3, 5));
    expect(s.status).toBe("stale");
  });
});

describe("cadence — completion clears reminder state", () => {
  it("logging today's entry moves weekly from overdue to current", () => {
    const before = computeWeeklyCadence([iso(addDays(sunday, -12))], sunday);
    expect(before.status).toBe("overdue");
    const after = computeWeeklyCadence([iso(sunday)], sunday);
    expect(after.status).toBe("current");
    expect(after.coversCurrentPeriod).toBe(true);
  });

  it("logging this month moves monthly from overdue to current", () => {
    const before = computeMonthlyCadence([iso(new Date(2026, 2, 20))], endMonth);
    expect(before.status).toBe("overdue");
    const after = computeMonthlyCadence([iso(new Date(2026, 3, 26))], endMonth);
    expect(after.status).toBe("current");
  });
});

describe("cadence — normalization & legacy data", () => {
  it("drops null, invalid, sentinel, and far-future dates", () => {
    const cleaned = normalizeEntryDates(
      [
        null,
        undefined,
        "",
        "not-a-date",
        "0001-01-01",
        "1970-01-01",
        "2099-01-01", // far future
        iso(addDays(wednesday, -3)),
      ],
      wednesday,
    );
    expect(cleaned.length).toBe(1);
  });

  it("does not let a stray future date make a brand-new client look current", () => {
    const future = addDays(wednesday, 60);
    const s = computeMonthlyCadence([iso(future)], wednesday);
    expect(s.status).toBe("missing_baseline");
  });
});

describe("cadence — badge labels", () => {
  it("returns sensible labels per status", () => {
    const a = computeMonthlyCadence([], wednesday);
    expect(cadenceBadgeLabel(a)).toBe("Baseline needed");
    const b = computeWeeklyCadence([], wednesday);
    expect(cadenceBadgeLabel(b)).toBe("Not started");
  });
});
