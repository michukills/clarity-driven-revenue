import { Navigate } from "react-router-dom";
// CRM / Pipeline domain — reuses the existing pipeline view.
export default function CRMPipelineDomain() {
  return <Navigate to="/admin/pipeline" replace />;
}