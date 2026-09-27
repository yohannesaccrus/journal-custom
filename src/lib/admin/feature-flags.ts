/**
 * The original admin sections (Dashboard, Assets & Stock, Orders) are parked while the
 * new customizer is tracked from its own "Customizer Stock" page. While this is false the
 * pages redirect away, the nav hides them, and none of their Shopify requests run.
 * Flip to true to bring them back exactly as they were.
 */
export const LEGACY_ADMIN_ENABLED = false;

export const CZ_STOCK_PATH = "/admin/customizer-stock";
