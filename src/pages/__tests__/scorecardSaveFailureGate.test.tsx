// p.scorecard.prevent-results-reveal-on-save-failure
//
// Behavioral tests for the public scorecard's lead-gate fail-closed
// guarantee: when the scorecard_runs insert fails, the score / pillar
// results / band MUST NOT be revealed. The user must remain on the lead
// gate with their answers and contact details intact, and a retry must
// be possible without losing state.
//
// Source-text invariants live in
// `src/lib/__tests__/scorecardLeadGateAfterInputs.test.ts`; this file
// renders the page and drives the actual save path.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ScorecardPage from "@/pages/Scorecard";
import { GEARS_V3 as PILLARS } from "@/lib/scorecard/rubricV3";

// jsdom does not implement IntersectionObserver; framer-motion's viewport
// feature requires it. A no-op shim is sufficient here.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = IOStub as any;
}
if (typeof window !== "undefined" && !(window as any).IntersectionObserver) {
  (window as any).IntersectionObserver = IOStub as any;
}
if (typeof window !== "undefined" && !(window as any).scrollTo) {
  (window as any).scrollTo = () => {};
}

// --- toast (sonner) -------------------------------------------------------
const toastError = vi.fn();
const toastMessage = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: any[]) => toastError(...a),
    message: (...a: any[]) => toastMessage(...a),
    success: vi.fn(),
  },
  Toaster: () => null,
}));

// --- supabase stub --------------------------------------------------------
// The scorecard generates a UUID before insert, saves without anonymous
// SELECT/RETURNING, and then invokes the non-AI follow-up dispatcher with the
// known UUID. We model that minimally and let each test control the insert
// response.
let nextInsertResponse: {
  error: { message: string } | null;
} = { error: null };
const invokeSpy = vi.fn(async (_name?: string, _opts?: unknown) => ({
  data: { status: "ok", followUpEmailStatus: "sent" },
  error: null,
}));
const insertSpy = vi.fn(async (_rows: any) => nextInsertResponse);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      insert: (rows: any) => insertSpy(rows),
    }),
    functions: {
      invoke: (name: string, opts?: unknown) => invokeSpy(name, opts),
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/scorecard"]}>
      <ScorecardPage />
    </MemoryRouter>,
  );
}

// Fill every pillar question with a strong, evidence-rich answer so the
// low-evidence prompt never short-circuits the flow.
const STRONG_ANSWER =
  "We review revenue every Monday in QuickBooks and HubSpot. The ops " +
  "manager owns it. We track 22 leads/month at a 31% close rate, average " +
  "deal $12,000, and job margin weekly. QuickBooks is reconciled monthly.";

async function advanceThroughAllPillars() {
  for (let p = 0; p < PILLARS.length; p++) {
    const gear = PILLARS[p];
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`Gear ${p + 1} of ${PILLARS.length}`, "i")),
      ).toBeInTheDocument();
    });
    // For each question on this gear, click the first ("Yes" / strong) option.
    for (const q of gear.questions) {
      const radios = await screen.findAllByRole("radio", {
        name: new RegExp(escapeRegex(q.options[0].label), "i"),
      });
      // Multiple gears can have the same option label across questions;
      // we want the radio whose name attribute matches this question id.
      const match =
        radios.find(
          (r) => (r as HTMLInputElement).name === `${gear.id}-${q.id}`,
        ) ?? radios[radios.length - 1];
      fireEvent.click(match);
    }
    const isLast = p === PILLARS.length - 1;
    const next = await screen.findByRole("button", {
      name: isLast ? /see my read/i : /next gear/i,
    });
    fireEvent.click(next);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fillLeadGate() {
  // Lead gate inputs are not htmlFor-associated; address them by their
  // form structure: required text inputs in document order are
  // [first_name, last_name, email(=email type), business_name, role, phone(=tel)].
  // Email has type=email and Phone has type=tel; everything else is text.
  // Wait for the gate itself first.
  await screen.findByRole("button", { name: /view my scorecard/i });

  const emailInput = document.querySelector(
    'input[type="email"]',
  ) as HTMLInputElement;
  const textInputs = Array.from(
    document.querySelectorAll('input[type="text"]'),
  ) as HTMLInputElement[];
  // Order in JSX: first_name, last_name, business_name, role.
  const [firstName, lastName, businessName] = textInputs;

  fireEvent.change(firstName, { target: { value: "Jane" } });
  fireEvent.change(lastName, { target: { value: "Doe" } });
  fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
  fireEvent.change(businessName, { target: { value: "Acme Trades" } });

  const select = document.querySelector("select") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "appointments_jobs" } });
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /view my scorecard/i }));
}

function expectNoResultsRevealed() {
  // Result-only headings / labels. None of these should be in the DOM
  // before a successful save.
  expect(
    screen.queryByText(/your rgs scorecard preliminary read/i),
  ).toBeNull();
  expect(screen.queryByText(/estimated overall/i)).toBeNull();
  expect(screen.queryByText(/maturity band/i)).toBeNull();
  expect(screen.queryByText(/pillar maturity/i)).toBeNull();
  expect(screen.queryByText(/recommended focus/i)).toBeNull();
}

beforeEach(() => {
  insertSpy.mockClear();
  invokeSpy.mockClear();
  toastError.mockClear();
  toastMessage.mockClear();
  nextInsertResponse = { error: null };
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
    "00000000-0000-4000-8000-000000000001",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Scorecard — save-failure does not reveal results", () => {
  it("save success reveals results", async () => {
    nextInsertResponse = { error: null };
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    await advanceThroughAllPillars();
    await fillLeadGate();
    clickSubmit();

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });
    expect(insertSpy.mock.calls[0][0][0].id).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledWith("scorecard-followup", {
        body: { runId: "00000000-0000-4000-8000-000000000001" },
      });
    });
    await screen.findByText(/your rgs scorecard preliminary read/i);
  }, 15000);

  it("save failure (generic error) keeps user on lead gate, no score shown", async () => {
    nextInsertResponse = { error: { message: "boom: network unreachable" } };
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    await advanceThroughAllPillars();
    await fillLeadGate();
    clickSubmit();

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });
    // Calm error toast surfaces.
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/couldn't save your scorecard/i),
      );
    });
    // User is back on the lead gate (its submit button + heading visible).
    await screen.findByRole("button", { name: /view my scorecard/i });
    expect(
      screen.getByText(/enter your contact details to view your read/i),
    ).toBeInTheDocument();
    // And no results were revealed.
    expectNoResultsRevealed();
  }, 15000);

  it("save failure preserves answers and contact fields, retry can succeed", async () => {
    nextInsertResponse = { error: { message: "boom" } };
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    await advanceThroughAllPillars();
    await fillLeadGate();
    clickSubmit();

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: /view my scorecard/i });

    // Contact fields are still filled.
    const emailInput = document.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const textInputs = Array.from(
      document.querySelectorAll('input[type="text"]'),
    ) as HTMLInputElement[];
    expect(textInputs[0].value).toBe("Jane");
    expect(emailInput.value).toBe("jane@example.com");
    expect(textInputs[2].value).toBe("Acme Trades");

    // Retry succeeds.
    nextInsertResponse = { error: null };
    clickSubmit();
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(2));
    await screen.findByText(/your rgs scorecard preliminary read/i);

    // Both attempts carried the deterministic score payload.
    const firstPayload = insertSpy.mock.calls[0][0][0];
    const secondPayload = insertSpy.mock.calls[1][0][0];
    expect(firstPayload.email).toBe("jane@example.com");
    expect(typeof firstPayload.overall_score_estimate).toBe("number");
    expect(secondPayload.overall_score_estimate).toBe(
      firstPayload.overall_score_estimate,
    );
    expect(secondPayload.rubric_version).toBe(firstPayload.rubric_version);
  }, 20000);

  it("rate-limit error also keeps results hidden and stays on the gate", async () => {
    nextInsertResponse = {
      error: { message: "scorecard_rate_limited: duplicate_submission_window" },
    };
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    await advanceThroughAllPillars();
    await fillLeadGate();
    clickSubmit();

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: /view my scorecard/i });
    expectNoResultsRevealed();
  }, 15000);
});
