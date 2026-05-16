/**
 * P93E-E2D — Plain-English text-intake Scorecard.
 *
 * Pins:
 *  • Public scorecard primary input is a textarea (not radio cards).
 *  • No quiz/test/survey/multiple-choice/personality-quiz framing.
 *  • Conservative interpretation hint visible on the question step.
 *  • Submit flow invokes scorecard-classify before deterministic scoring,
 *    and the lead capture insert still fires.
 *  • Low-confidence answers surface a calm banner on the result page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ScorecardPage from "@/pages/diagnostic/StabilityScorecardTool";
import { GEARS_V3 } from "@/lib/scorecard/rubricV3";

class IOStub {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
}
if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = IOStub as any;
}
if (typeof window !== "undefined" && !(window as any).scrollTo) {
  (window as any).scrollTo = () => {};
}

const realInsert = vi.fn(async () => ({ error: null }));
const realInvoke = vi.fn(async (name: string) => {
  if (name === "scorecard-classify") {
    // Return one low-confidence classification for the first question of
    // the first gear so the result page can render the banner.
    const firstGear = GEARS_V3[0];
    const firstQ = firstGear.questions[0];
    const lowOpt = [...firstQ.options].sort((a, b) => a.weight - b.weight)[0];
    return {
      data: {
        classifier_status: "rules",
        rubric_version: "v3_deterministic_gears",
        classifications: [
          {
            question_id: firstQ.id,
            gear: firstGear.id,
            owner_text: "we kind of just wing it",
            classified_option_id: lowOpt.id,
            classified_option_label: lowOpt.label,
            confidence: "low",
            classification_rationale: "vague answer",
            insufficient_detail: true,
            follow_up_question: null,
            classifier_type: "rules",
          },
        ],
      },
      error: null,
    };
  }
  return { data: { followUpEmailStatus: "sent" }, error: null };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), message: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: (...args: any[]) => (realInsert as any)(...args) }),
    functions: {
      invoke: (name: string, opts?: any) => (realInvoke as any)(name, opts),
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
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={["/scorecard"]}
    >
      <ScorecardPage />
    </MemoryRouter>,
  );
}

describe("P93E-E2D — text-intake Scorecard", () => {
  it("public copy never frames the experience as a quiz/test/survey", async () => {
    renderPage();
    await screen.findByRole("button", { name: /begin diagnostic part 1/i });
    const body = (document.body.textContent || "").toLowerCase();
    expect(body).not.toMatch(/multiple-choice/);
    expect(body).not.toMatch(/take the quiz/);
    expect(body).not.toMatch(/personality quiz/);
    expect(body).not.toMatch(/no essays required/);
    expect(body).not.toMatch(/this is a survey/);
  });

  it("question step renders text intake — textareas, not radio cards", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /begin diagnostic part 1/i }),
    );
    const intakes = await screen.findAllByTestId("text-intake-question");
    expect(intakes.length).toBeGreaterThan(0);
    const textareas = await screen.findAllByTestId("text-intake-textarea");
    expect(textareas.length).toBe(intakes.length);
    // No radio inputs as the public scoring control.
    expect(document.querySelectorAll('input[type="radio"]').length).toBe(0);
    // Stale "operational state" cards are gone.
    expect(screen.queryByTestId("assessment-option")).toBeNull();
  });

  it("textareas enforce a 1500-char cap and show the conservative-interpretation hint", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /begin diagnostic part 1/i }),
    );
    const ta = (await screen.findAllByTestId("text-intake-textarea"))[0] as HTMLTextAreaElement;
    expect(ta.maxLength).toBe(1500);
    // Gear-level conservative hint is visible.
    expect(
      screen.getByTestId("scorecard-gear-context-note").textContent || "",
    ).toMatch(/interpreted conservatively/i);
  });

  it("submit flow calls scorecard-classify before saving and renders the low-confidence banner", async () => {
    realInsert.mockClear();
    realInvoke.mockClear();
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /begin diagnostic part 1/i }),
    );
    // Provide one usable answer in gear 1.
    const ta = (await screen.findAllByTestId("text-intake-textarea"))[0] as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "we kind of just wing it daily" } });

    // Click "Next gear" through gears 1..N-1, then "See my read" on the last.
    for (let i = 0; i < GEARS_V3.length - 1; i++) {
      const btn = await screen.findByRole("button", { name: /next gear/i });
      fireEvent.click(btn);
      await waitFor(() => {
        const indicator = screen.getByText(
          new RegExp(`Gear ${i + 2} of ${GEARS_V3.length}`, "i"),
        );
        expect(indicator).toBeInTheDocument();
      });
    }
    const seeBtn = await screen.findByRole("button", { name: /see my read/i });
    fireEvent.click(seeBtn);
    // Dismiss incomplete prompt if it appears.
    const submitAnyway = screen.queryByRole("button", { name: /submit anyway/i });
    if (submitAnyway) fireEvent.click(submitAnyway);

    // Lead form (Field renders sibling label, not htmlFor — query by index).
    await screen.findByRole("button", { name: /view my scorecard/i });
    const inputs = document.querySelectorAll("input");
    // First six inputs are: first, last, email, business, role, phone.
    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: "Ada" } });
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: "Lovelace" } });
    fireEvent.change(inputs[2] as HTMLInputElement, { target: { value: "ada@example.com" } });
    fireEvent.change(inputs[3] as HTMLInputElement, { target: { value: "Acme" } });
    const select = document.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "general_services" } });
    fireEvent.click(screen.getByRole("button", { name: /view my scorecard/i }));

    await waitFor(() => {
      expect(realInvoke).toHaveBeenCalled();
    });
    // Classifier was called BEFORE the followup invoke.
    const firstCallName = realInvoke.mock.calls[0]?.[0];
    expect(firstCallName).toBe("scorecard-classify");
    // Lead capture insert fired.
    expect(realInsert).toHaveBeenCalled();
    // Result page banner rendered.
    expect(
      await screen.findByTestId("scorecard-low-confidence-banner"),
    ).toBeInTheDocument();
  }, 15000);
});