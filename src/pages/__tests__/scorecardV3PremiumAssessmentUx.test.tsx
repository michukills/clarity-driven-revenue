/**
 * P93E-E2B — Scorecard renders premium assessment UX, not a quiz.
 *
 * Pins:
 *  • Intro copy uses "structured" / "operational state" language.
 *  • Question step exposes "Current operational state" controls.
 *  • Each question offers an optional "Owner context (optional)" textarea.
 *  • Helper copy tells the user owner context does not change the score.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ScorecardPage from "@/pages/Scorecard";

class IOStub {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
}
if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = IOStub as any;
}
if (typeof window !== "undefined" && !(window as any).scrollTo) {
  (window as any).scrollTo = () => {};
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), message: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: async () => ({ error: null }) }),
    functions: { invoke: async () => ({ data: { followUpEmailStatus: "sent" }, error: null }) },
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

describe("P93E-E2B Scorecard premium assessment UX", () => {
  it("intro copy frames the experience as a structured assessment, not a quiz", async () => {
    renderPage();
    expect(
      await screen.findByText(/structured first-pass systems assessment/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/structured questions/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/closest current\s+operational state/i).length,
    ).toBeGreaterThan(0);
    // No "multiple-choice" / "quiz" framing.
    expect(screen.queryByText(/multiple-choice/i)).toBeNull();
    expect(screen.queryByText(/take the quiz/i)).toBeNull();
  });

  it("question step shows operational state controls and an owner context textarea", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    // Premium framing in the question step (gear-level note exists).
    const note = await screen.findByTestId("scorecard-gear-context-note");
    expect(note.textContent || "").toMatch(/closest\s+current operational state/i);
    // "Current operational state" labels exist on each question's option group.
    await waitFor(() => {
      expect(
        screen.getAllByText(/current operational state/i).length,
      ).toBeGreaterThan(0);
    });
    // P93E-E2C — owner context is COLLAPSED by default; no textareas
    // render until the user clicks "Add context for RGS review".
    expect(document.querySelectorAll("textarea").length).toBe(0);
    const addContextButtons = screen.getAllByTestId("assessment-add-context");
    expect(addContextButtons.length).toBeGreaterThan(0);
    fireEvent.click(addContextButtons[0]);
    await waitFor(() => {
      expect(document.querySelectorAll("textarea").length).toBe(1);
    });
    // Gear-level note (shown once) explicitly disclaims the score impact.
    expect(
      screen.getAllByText(/does not change your score/i).length,
    ).toBeGreaterThan(0);
  });
});
