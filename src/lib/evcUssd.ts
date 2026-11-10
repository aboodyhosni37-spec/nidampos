/** EVC Plus USSD payment code. Merchant code and format are fixed by the business. */
export const EVC_USSD_MERCHANT = "62271";

/**
 * Amount text for the code. Decimal amounts use an asterisk in place of the
 * decimal point (3.75 → "3*75", 5.5 → "5*50"); whole amounts stay as-is
 * (12 → "12"). Only the code text changes — never the order amount.
 */
export function evcUssdAmount(total: number): string {
  const cents = Math.max(0, Math.round((Number(total) || 0) * 100));
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  return fraction === 0 ? String(whole) : `${whole}*${String(fraction).padStart(2, "0")}`;
}

/** Builds the exact USSD string, e.g. *789*62271*5*50# */
export function evcUssdCode(total: number): string {
  return `*789*${EVC_USSD_MERCHANT}*${evcUssdAmount(total)}#`;
}

/**
 * tel: deep link for the dialer. `*` and `#` are percent-encoded: raw `*`
 * makes some QR scanners offer a web search, and raw `#` is cut off as a
 * URL fragment.
 */
export function evcUssdTelLink(total: number): string {
  const encoded = evcUssdCode(total).replace(/\*/g, "%2A").replace(/#/g, "%23");
  return `tel:${encoded}`;
}
