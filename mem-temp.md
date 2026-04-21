---
name: Client Portal
description: Role-based admin + customer portal with auth, pipeline DnD, customers, worksheets, file storage
type: feature
---
Routes:
- /auth — sign in / sign up (email+password + Google OAuth)
- /admin/* — admin area (dashboard, pipeline, customers, customers/:id, worksheets, files, settings)
- /portal/* — customer area (dashboard, resources, worksheets, progress, account)

Roles: stored in `user_roles` table (admin | customer). New signups default to customer. Admin role granted manually via Cloud DB. `is_admin(uuid)` security-definer function used in RLS.

Tables: profiles, user_roles, customers, customer_notes (admin-only), resources, resource_assignments, activity_log. Storage bucket: `resources` (private).

Pipeline stages enum (8): lead, discovery_scheduled, diagnostic_in_progress, diagnostic_delivered, awaiting_decision, implementation, work_in_progress, work_completed. Drag-and-drop board uses @dnd-kit/core; updates `customers.stage`.

Resource categories enum (5): diagnostic_templates, revenue_worksheets, financial_visibility, scorecards, client_specific.

RLS: admins manage everything; customers see only their own customer row, only assigned resources, only assigned files in storage. Notes are admin-only.

Layout: PortalShell renders fixed left sidebar (w-64, bg hsl(0 0% 10%)) + main content area. AdminNav and CustomerNav defined inside.
