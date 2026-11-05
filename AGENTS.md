- Super Admin panel (/super-admin) uses Lovable Cloud email auth + user_roles/has_role, separate from POS PIN sessions — keeps platform admin isolated from staff logins.
- Cart item rows and summary are presentation-only components; POS retains all state, calculations and action handlers so visual redesigns do not change order behavior.
- POS cart item layout must follow the cart panel's own width (container query), not the viewport: aligned columns only when the panel is wide enough, compact stacked rows otherwise, so the panel can stay narrow without unreadable item names.

- Customer presentation is scoped under customer-site and uses the separate customer cart; staff styles and POS handlers remain independent.
- Customer ordering must use authoritative transactional server logic and private per-order tracking credentials; browser prices, restaurant parameters, and order numbers are not authorization.
- POS tenant access uses server-minted staff identity and live membership/status checks; public guests have menu-only reads and narrowly validated order operations.
- Online fulfillment stages do not settle payments; cancellation uses existing void exclusions and paid orders require existing payment handling first.
- Meal schedules live in the existing website content JSON; customer cart and authoritative guest checkout share inclusive-opening/exclusive-closing Mogadishu windows, while staff order paths remain unaffected.
