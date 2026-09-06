# POS layout and sizing refinement

## Goal
Improve spacing, proportions, and responsiveness throughout the existing POS interface without changing behavior, data, workflows, colors, or features.

## What will change
- Rebalance the POS workspace so the category area, product area, and cart use available desktop width intelligently.
- Give the cart a stable responsive width, a clearer item layout for name, price, quantity controls, line total, and remove action, and prevent unnecessary name truncation.
- Keep the payment area visible and scrollable independently when content is tall; strengthen total and checkout button sizing for touch use.
- Adjust product card columns and dimensions at common desktop and compact widths so neither products nor cart are squeezed.
- Tighten only wasteful outer spacing while preserving comfortable internal spacing, search height, category controls, and top controls.
- Normalize page widths, table overflow, action wrapping, cards, forms, and dialog sizing across Dashboard, Orders, Inventory, Expenses, Reports, Settings, Customers, and Staff.
- Preserve the existing visual design and every current control and action.

## Responsive behavior
- Wide desktop: full-width workspace with balanced category, product, and cart columns.
- Standard desktop: narrower category rail, stable cart, adaptive product columns.
- Compact desktop/tablet: categories become horizontal controls and the cart moves below the product area at a usable width rather than squeezing side-by-side.
- Tables and forms retain readable minimum widths with contained horizontal scrolling where needed.

## Validation
- Test the POS with cart items at 1920px, 1440px, 1280px, and 1024px desktop widths.
- Check product names, quantity controls, prices, totals, payment choices, and checkout actions for clipping or overlap.
- Spot-check all requested pages and dialogs for overflow, unusable controls, and inconsistent spacing.
- Confirm the app builds cleanly and no business or printing logic changed.
