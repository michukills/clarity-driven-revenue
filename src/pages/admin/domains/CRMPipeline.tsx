import { Navigate } from "react-router-dom";
// P12.4.B.UI — The legacy flow-chart Pipeline view has been replaced by the
// lifecycle board on /admin/customers. CRM / Pipeline now points there so the
// new customer-card lifecycle board is the single customer-flow surface.
export default function CRMPipelineDomain() {
  return <Navigate to="/admin/customers" replace />;
}