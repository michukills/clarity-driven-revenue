import { Navigate } from "react-router-dom";
// Client Management domain — reuses the existing customers view.
export default function ClientManagementDomain() {
  return <Navigate to="/admin/customers" replace />;
}