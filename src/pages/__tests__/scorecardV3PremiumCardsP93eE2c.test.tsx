/**
 * P93E-E2C — Premium operational-state card UX + collapsible owner context.
 *
 * Locks in:
 *  - Each question renders selectable cards (data-testid="assessment-option")
 *    with a custom indicator dot, not a visible browser radio circle.
 *  - Native radios are still present (sr-only) for accessibility/keyboard.
 *  - Selected option carries data-selected="true" and the primary-tinted
 *    visual state.
 *  - Owner context textareas are collapsed by default — toggled per
 *    question via "Add context for RGS review".
 *  - The repeated per-question "Used for admin review only" helper is
 *    gone; the gear-level note is shown once instead.
 *  - The page never renders a "Project preview" string from app code.
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

function renderAndStart() {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={["/scorecard"]}
    >
      <ScorecardPage />
    </MemoryRouter>,
  );
}

describe("P93E-E2C — premium operational-state cards", () => {
  it("renders selectable cards with sr-only radios and custom indicators", async () => {
    renderAndStart();
    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    const options = await screen.findAllByTestId("assessment-option");
    expect(options.length).toBeGreaterThan(0);

    // Native radios are still present (a11y/keyboard) but visually hidden.
    const radios = document.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThan(0);
    radios.forEach((r) => {
      expect((r as HTMLInputElement).className).toMatch(/sr-only/);
    });

    // Custom indicator dot exists for every option.
    const indicators = screen.getAllByTestId("assessment-option-indicator");
    expect(indicators.length).toBe(options.length);

    // Each option group is wired as a radiogroup for screen readers.
    const groups = document.querySelectorAll('[role="radiogroup"]');
    expect(groups.length).toBeGreaterThan(0);
  });

  it("clicking an option flips data-selected and visually marks it", async () => {
    renderAndStart();
    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    const options = await screen.findAllByTestId("assessment-option");
    const target = options[0];
    expect(target.getAttribute("data-selected")).toBe("false");
    fireEvent.click(target);
    await waitFor(() => {
      expect(target.getAttribute("data-selected")).toBe("true");
      expect(target.className).toMatch(/border-primary/);
    });
  });

  it("owner context is collapsed by default and toggles per question", async () => {
    renderAndStart();
    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    expect(await screen.findAllByTestId("assessment-add-context")).toBeTruthy();
    expect(document.querySelectorAll("textarea").length).toBe(0);

    const addBtns = screen.getAllByTestId("assessment-add-context");
    fireEvent.click(addBtns[0]);
    await waitFor(() => {
      expect(document.querySelectorAll("textarea").length).toBe(1);
    });
    expect(screen.getAllByTestId("assessment-context-panel").length).toBe(1);
  });

  it("does not repeat the per-question 'admin review only' helper line", async () => {
    renderAndStart();
    fireEvent.click(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    );
    await screen.findAllByTestId("assessment-option");
    expect(
      screen.queryAllByText(/Used for admin review only\./i).length,
    ).toBe(0);
    // But the single gear-level context note is present.
    expect(screen.getByTestId("scorecard-gear-context-note")).toBeInTheDocument();
  });

  it("never renders a 'Project preview' string from app code", async () => {
    renderAndStart();
    expect(
      await screen.findByRole("button", { name: /start the rgs scorecard/i }),
    ).toBeInTheDocument();
    expect(document.body.textContent || "").not.toMatch(/Project preview/i);
  });
});