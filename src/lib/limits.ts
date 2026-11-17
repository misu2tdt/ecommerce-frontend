// The limits the backend enforces on what it accepts. They mirror the backend's
// src/validation/limits.ts (ecommerce-backend); when one changes there, change
// it here. The storefront and the admin forms use them to refuse a value
// before it is sent, with a message that says what is allowed, because the
// backend answers an out-of-range value with a plain 400.

/** The largest id: ids are 32-bit integers in the database. */
export const ID_MAX = 2_147_483_647;

/** The largest price or money amount, in VND, that the backend accepts. */
export const PRICE_MAX_VND = 1_000_000_000_000;

/** The most units of one product in one cart or order line. */
export const QUANTITY_MAX_PER_LINE = 99;

/** The most different products (lines) in one cart or order. */
export const CART_LINES_MAX = 50;

/** The largest stock count an admin can set for a variant. */
export const STOCK_MAX = 1_000_000;

/** The largest display position of a variant or an image. */
export const POSITION_MAX = 10_000;
