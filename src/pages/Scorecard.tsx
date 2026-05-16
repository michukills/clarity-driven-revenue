/**
 * P96D — Public /scorecard is no longer the full standalone scorecard tool.
 *
 * The Business Stability Scorecard now lives inside the Diagnostic OS as
 * Diagnostic Part 1 — Business Stability Assessment. The full tool is
 * mounted at /diagnostic/scorecard behind ProtectedRoute (and at the
 * admin/portal diagnostic surfaces). Public traffic that lands here is
 * redirected to the Operational Friction Scan (/scan), which is the
 * directional public lead-gen entry experience.
 *
 * The deterministic v3 scorecard engine itself is unchanged — only the
 * public access surface was relocated.
 */
import { Navigate } from "react-router-dom";
import { SCAN_PATH } from "@/lib/cta";

export default function PublicScorecardRedirect() {
  return <Navigate to={SCAN_PATH} replace />;
}
