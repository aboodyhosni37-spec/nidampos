- Super Admin panel (/super-admin) uses Lovable Cloud email auth + user_roles/has_role, separate from POS PIN sessions — keeps platform admin isolated from staff logins.
- Cart item rows and summary are presentation-only components; POS retains all state, calculations and action handlers so visual redesigns do not change order behavior.

- Customer presentation is scoped under customer-site and uses the separate customer cart; staff styles and POS handlers remain independent.
- Customer ordering must use authoritative transactional server logic and private per-order tracking credentials; browser prices, restaurant parameters, and order numbers are not authorization.
