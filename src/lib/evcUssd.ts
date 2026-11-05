/** EVC Plus USSD payment code. Merchant code and format are fixed by the business. */
export const EVC_USSD_MERCHANT = "62271";

/**
 * Amount text for the code: always a plain decimal number with a decimal
 * POINT, e.g. "1.50" — never an asterisk in place of the dot.
 */
export function evcUssdAmount(total: number): string {
  const n = Math.max(0, Math.round((Number(total) || 0) * 100) / 100);
  return n.toFixed(2);
}

/** Builds the exact USSD string, e.g. *789*62271*5.50# */
export function evcUssdCode(total: number): string {
  return `*789*${EVC_USSD_MERCHANT}*${evcUssdAmount(total)}#`;
}

/**
 * tel: deep link for the dialer.
 *
 * `*`, `#` and `.` are percent-encoded; digits stay literal.
 * - Raw `*` makes some QR scanners treat the content as plain text and offer
 *   a web search; raw `#` is cut off as a URL fragment.
 * - A raw `.` is not a legal phone character in a tel: link, so dialers
 *   substitute it (often with `*`, giving *789*62271*1*50#). Escaping it as
 *   %2E makes the dialer decode the decimal point back intact.
 */
export function evcUssdTelLink(total: number): string {
  const code = evcUssdCode(total);
  const encoded = code
    .replace(/\*/g, "%2A")
    .replace(/\./g, "%2E")
    .replace(/#/g, "%23");
  return `tel:${encoded}`;
}
