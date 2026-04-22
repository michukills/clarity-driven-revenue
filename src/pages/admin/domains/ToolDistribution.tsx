import { Navigate } from "react-router-dom";
// Tool Distribution System — reuses the existing tools admin.
export default function ToolDistributionDomain() {
  return <Navigate to="/admin/tools" replace />;
}