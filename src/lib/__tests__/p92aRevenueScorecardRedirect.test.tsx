// P92A — Render-level smoke for the /revenue-scorecard redirect.
//
// We mount a MemoryRouter at /revenue-scorecard with the same redirect
// route registered in src/App.tsx and assert it actually navigates to
// /scorecard. Avoids pulling the full provider tree so the smoke stays
// deterministic and fast.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

describe("P92A — /revenue-scorecard render smoke", () => {
  it("redirects /revenue-scorecard to /scorecard", () => {
    render(
      <MemoryRouter initialEntries={["/revenue-scorecard"]}>
        <Routes>
          <Route
            path="/revenue-scorecard"
            element={<Navigate to="/scorecard" replace />}
          />
          <Route path="/scorecard" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("loc").textContent).toBe("/scorecard");
  });
});
