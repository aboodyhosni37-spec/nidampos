# Phase 2: Separate data per restaurant

Backup done: all 22 tables saved to a download file, with row counts (1,401 orders, 2,597 payments, 141 products, 12 customers). A second copy will be kept inside the database before any change.

## Step 1 - Secure PIN sign-in (staff see no change)
- Same PIN screen. The PIN is checked on the server instead of in the browser.
- On success, the server signs the staff member in with a hidden account linked to their staff record and restaurant.
- PINs are no longer readable from the browser.
- The POS link `?restaurant=...` only picks the restaurant. The server decides if the user may enter it.

## Step 2 - Tag every record with its restaurant
- Add a restaurant link to: products, categories, orders, order items, payments, customers, due, deposits, loyalty, expenses, expense categories, staff, salaries, sessions, settings, website content, roles, audit log.
- All existing rows are linked to LamaHamar Cafe (the only restaurant with data). Nothing is deleted or changed otherwise.
- Order numbers become per restaurant (LamaHamar keeps its current numbers).
- Counts are compared against the backup.

## Step 3 - Server enforces separation
- Database rules: a signed-in staff member can only read/write rows of their own restaurant, and only while it is Active with a valid subscription.
- Suspended/inactive/expired: POS shows a clear "access blocked" message; data kept.
- Super Admin keeps access to all restaurants through the admin panel.
- Public customer website: can only read visible products/content of its restaurant and place orders.
- Audit log: readable only by Super Admin and owners of that restaurant; nobody can edit or delete it.

## Step 4 - Super Admin
- New restaurant gets empty settings and nothing copied from LamaHamar.
- Assign staff and set their role per restaurant. Staff cannot change their own role or restaurant.
- Owner accounts: no fake accounts; owners are added as POS staff with PIN by Super Admin.

## Step 5 - Testing (before LamaHamar switches)
- Create a test restaurant, add a test cashier, place orders, confirm LamaHamar never sees them and vice versa.
- Try wrong restaurant in the link, suspended, expired, wrong PIN.
- Check LamaHamar POS, orders, reports, receipts, customers still match.
- Report results honestly, including anything that failed.

## Technical details
- Edge function `pos-login` (service role): verify PIN hash, map app_user to an auth user (synthetic email, auto-provisioned), return session; JWT `app_metadata` holds app_user_id + restaurant_id + role.
- `restaurant_id uuid` column with default from `current_restaurant_id()` helper (reads JWT), backfilled to lamahamar id, then NOT NULL.
- RLS: `restaurant_id = current_restaurant_id() and restaurant_active(restaurant_id)` or `has_role(auth.uid(),'super_admin')`.
- PINs hashed (pgcrypto); anon SELECT on app_users removed.
- In-DB backup schema `backup_20261007` with copies of all tables.
- Rollback: drop new policies, restore old ones; columns are additive.
