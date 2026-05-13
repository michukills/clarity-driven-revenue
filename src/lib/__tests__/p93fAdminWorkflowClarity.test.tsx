/**
 * P93F — Admin workflow clarity pass.
 *
 * Locks in:
 *  - Account email visible in identity header.
 *  - Delete dialog shows the exact email + identity, requires the email to be
 *    typed, and surfaces an extra warning for real-client accounts.
 *  - Specialist tool menu is collapsed by default and groups tools by purpose
 *    instead of dumping ~14 buttons in the page header.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountIdentityHeader } from "@/components/admin/AccountIdentityHeader";
import { DeleteAccountDialog } from "@/components/admin/DeleteAccountDialog";
import { AdminSpecialistToolMenu } from "@/components/admin/AdminSpecialistToolMenu";

function mockClipboard() {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
}

const realClient = {
  id: "11111111-1111-1111-1111-111111111111",
  full_name: "Jane Operator",
  business_name: "Operator Co",
  email: "jane@operator.example",
  is_demo_account: false,
  payment_status: "paid",
  portal_unlocked: true,
  stage: "diagnostic",
  diagnostic_status: "in_progress",
  implementation_status: "not_started",
};

const demoAccount = {
  ...realClient,
  id: "22222222-2222-2222-2222-222222222222",
  full_name: "Demo Sample",
  business_name: "Demo Co",
  email: "demo@example.com",
  is_demo_account: true,
  payment_status: "demo",
};

beforeEach(() => {
  mockClipboard();
});

describe("P93F — AccountIdentityHeader", () => {
  it("renders the account email in the identity card with a copy button", () => {
    render(<AccountIdentityHeader customer={realClient as any} />);
    const emailEl = screen.getByTestId("identity-email");
    expect(emailEl.textContent).toBe("jane@operator.example");
    expect(screen.getByTestId("identity-email-copy")).toBeTruthy();
  });

  it("falls back to a placeholder when no email is on file", () => {
    render(
      <AccountIdentityHeader
        customer={{ ...realClient, email: null } as any}
      />,
    );
    expect(screen.getByTestId("identity-email").textContent).toMatch(/no email/i);
  });
});

describe("P93F — DeleteAccountDialog", () => {
  it("shows the exact account email and an inline copy button", () => {
    render(
      <DeleteAccountDialog
        open
        onOpenChange={() => {}}
        customer={demoAccount as any}
        onConfirmDelete={async () => {}}
      />,
    );
    expect(screen.getByTestId("delete-account-email").textContent).toBe(
      "demo@example.com",
    );
    expect(screen.getByTestId("delete-account-copy-email")).toBeTruthy();
  });

  it("disables the confirm button until the typed email matches", () => {
    render(
      <DeleteAccountDialog
        open
        onOpenChange={() => {}}
        customer={demoAccount as any}
        onConfirmDelete={async () => {}}
      />,
    );
    const submit = screen.getByTestId(
      "delete-account-confirm-submit",
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const input = screen.getByTestId(
      "delete-account-confirm-input",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "wrong@example.com" } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "demo@example.com" } });
    expect(submit.disabled).toBe(false);
  });

  it("calls the delete handler only when the email matches", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteAccountDialog
        open
        onOpenChange={() => {}}
        customer={demoAccount as any}
        onConfirmDelete={onConfirm}
      />,
    );
    fireEvent.change(
      screen.getByTestId("delete-account-confirm-input"),
      { target: { value: "demo@example.com" } },
    );
    fireEvent.click(screen.getByTestId("delete-account-confirm-submit"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("surfaces the real-client guardrail warning for real clients", () => {
    render(
      <DeleteAccountDialog
        open
        onOpenChange={() => {}}
        customer={realClient as any}
        onConfirmDelete={async () => {}}
      />,
    );
    expect(
      screen.getByTestId("delete-account-real-client-warning"),
    ).toBeTruthy();
  });

  it("does not show the real-client guardrail for demo accounts", () => {
    render(
      <DeleteAccountDialog
        open
        onOpenChange={() => {}}
        customer={demoAccount as any}
        onConfirmDelete={async () => {}}
      />,
    );
    expect(
      screen.queryByTestId("delete-account-real-client-warning"),
    ).toBeNull();
  });
});

describe("P93F — AdminSpecialistToolMenu", () => {
  it("starts collapsed and only renders the toggle initially", () => {
    render(
      <MemoryRouter>
        <AdminSpecialistToolMenu customerId={realClient.id} />
      </MemoryRouter>,
    );
    const menu = screen.getByTestId("admin-specialist-tool-menu");
    const toggle = within(menu).getByTestId("admin-specialist-tool-menu-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // Specialist tool links must not be visible until the admin opens the menu.
    expect(within(menu).queryByText("Implementation Roadmap")).toBeNull();
  });

  it("expands to show grouped tool links on click", () => {
    render(
      <MemoryRouter>
        <AdminSpecialistToolMenu customerId={realClient.id} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("admin-specialist-tool-menu-toggle"));
    expect(screen.getByText("Implementation Roadmap")).toBeTruthy();
    expect(screen.getByText("Scorecard History")).toBeTruthy();
    // "Financial Visibility" appears as both group title and an item label.
    expect(screen.getAllByText("Financial Visibility").length).toBeGreaterThanOrEqual(1);
  });
});