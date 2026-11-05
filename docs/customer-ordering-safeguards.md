# Customer ordering safeguards

## Existing data snapshot
The locked `backup_customer_20261105` schema holds copies of 21 application tables, plus policies, grants and public function definitions. Anonymous and authenticated users have no schema access. Verified invoice/product/customer/payment counts and rows matched the source immediately after copying: 2,051 invoices, 145 products, 12 customers and 3,860 payments. Later business activity is not part of that snapshot.

## Application architecture
- Existing Lovable Cloud data and staff PIN login remain in place.
- Customer presentation and cart are independent from staff POS presentation and cart.
- `customer-orders` only accepts validated guest checkout or a private tracking credential. Checkout fixes the restaurant server-side, loads product prices and settings, and creates an invoice, its items, payment record and tracking hash in one transaction. No payment is confirmed by guest checkout.
- A stable reference plus request fingerprint prevents duplicate checkout and reference reuse for a different cart. The browser receives a private fragment-based tracking link; phone/address are not returned by tracking.
- POS policies validate server-minted identity, restaurant membership, account state and subscription. PIN values are not readable by the client.
- Existing global order resequencing is service-only to prevent cross-restaurant changes.

## Rollback
Do not restore the snapshot wholesale over newer live orders. For a customer-UI rollback, restore the previous page/module versions while keeping private ordering and security policies. For a database rollback, compare affected rows with the locked snapshot, preserve all later legitimate transactions, and perform reviewed targeted repairs through an authorized operator. Policies, grants and function definitions can be inspected from the snapshot, but never restore broad public access to customer/order/payment/PIN records.

## Verification and limitations
Guest checkout with one real product saved one unpaid online order; a retry returned the same ID, a changed retry was rejected, and an incorrect tracking credential was rejected. The clearly marked test order was removed after verification. Customer pages had no horizontal overflow at tested desktop/tablet/phone sizes. Authenticated staff PIN-screen, fulfillment transitions, payment/printer and notification delivery still need a valid staff session; email-only platform-admin access is intentionally insufficient.