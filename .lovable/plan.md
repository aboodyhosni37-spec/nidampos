# LamaHamar Cafe customer website and ordering

## Preserve
- Keep the existing application, Lovable Cloud backend, real menu, product photos and prices, restaurant records, staff accounts, PIN login, roles, payments, printing, and POS layout.
- No Firebase migration, SMS integration, SMS notifications, credentials, or endpoints.
- Keep the SEO title exactly **LamaHamar Cafe — Cuntada Dalka**.

## Inspection findings
- The customer home, menu, and checkout already exist and load real products. The hosted service is currently responding normally.
- The home page's saved heading fields are empty, leaving a large logo image instead of a clear restaurant heading and ordering entry.
- Customer and staff carts already have separate state. Existing protected staff pages can remain intact while adding the requested staff addresses.
- Online orders already enter the shared order tables unpaid, but saving uses several separate requests. A failure can leave an incomplete order, and prices are currently accepted from the browser.
- Deployed order, customer, and menu access rules currently permit public reads and writes without restaurant isolation. A public order-tracking page must not expose those records or rely on an order number as authorization.

## Stage 1 — Customer presentation and navigation
- Redesign only the customer experience: dominant black and white, restrained accents, editorial typography, clean full-width sections, consistent buttons, and accessible mobile navigation.
- Build a photograph-led first section with the actual restaurant name and Order Now button. Retain the official logo in navigation and use existing real food photographs rather than replacing them with invented product imagery.
- Add category browsing and featured items using existing products. Include Somali food and coffee/beverages sections based on actual matching menu categories and items.
- Preserve the restaurant's saved about text, contact information, WhatsApp link, location, and hours. Do not invent business details, ratings, popularity claims, or new menu items.
- Redesign `/menu` with category navigation, search, product details, quantity selection, add-to-cart, and a cart summary. Preserve website visibility settings. Missing photos get a neutral non-photo treatment rather than another dish's photograph.
- Add `/checkout`; retain `/order` compatibility. Add `/staff/login`, `/staff/pos`, and `/staff/dashboard` entry addresses while retaining current protected staff pages and old links.
- Check desktop, tablet, and mobile layouts, keyboard access, readable names, and no page-wide horizontal overflow.

## Stage 2 — Safe guest checkout and order status
- Before changing data access, document effective access rules and create a verified snapshot of affected tables and rules with a rollback procedure. No deletion, replacement, or reassignment of existing records.
- Use a server-validated, restaurant-scoped guest checkout that checks current product prices, visibility/availability, quantities, tax settings, and delivery fees. Save the order and related records atomically with an idempotent checkout reference.
- Offer Pickup and Delivery while preserving existing Dine-in behavior. Keep the existing Banadir district fee rules for Delivery; Pickup adds no delivery fee.
- Keep orders unpaid until staff confirm payment, preserving existing payment methods and settlement behavior.
- Add `/order-status` and confirmation with a private, unguessable tracking credential scoped to the individual order. Reveal only that customer's order—not customer lists, staff records, payments, or other restaurants' orders.
- Establish the required server-enforced restaurant and staff access checks before using tracking or opening any new public data access. Keep PIN login and the POS presentation unchanged.

## Stage 3 — Staff handoff and verification
- Extend the existing order-management view only where necessary for online-order indicators, notifications, customer contact/details, notes, Pickup/Delivery information, and the workflow: Accept, Preparing, Ready, Out for delivery, Completed, Cancelled.
- Keep preparation status separate from payment status; completing preparation must never imply paid.
- Confirm an online order appears once for the assigned restaurant and status updates return to its private customer page. Verify another customer or restaurant cannot read or change it.
- Add focused tests for authoritative totals, the four $1 delivery districts and the other $1.50 districts, zero-fee Pickup, unpaid creation, duplicate retries, and private order access.
- Check preview compilation and relevant tests. Exercise a clearly identified test order without altering existing orders, products, stock, or customer balances. Report any staff-account verification blocker rather than claiming an untested workflow works.

## Technical approach
- React/Vite customer pages, existing design-system controls and semantic tokens; customer-specific styling must not alter staff styling.
- Existing Lovable Cloud tables and shared invoice model remain the source of truth. Any required changes are additive and documented.
- Guest checkout/status operate through narrowly scoped server functions, with private tracking credentials and authoritative transaction logic. Browser restaurant parameters and cached roles are never authorization.
- Staff subscription and tenant checks are enforced server-side. Security changes are validated against existing staff login and cross-restaurant access before rollout.
- Prefer the supported live-update mechanism; use bounded polling where live subscriptions would expose private customer records.

## Delivery order
Complete the visual customer experience first, then enable the secure checkout/status and staff handoff after their access checks pass. Do not label the website ready for business ordering until the end-to-end and privacy checks succeed.