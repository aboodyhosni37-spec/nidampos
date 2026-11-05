/** EVC Plus USSD payment code. Merchant code and format are fixed by the business. */
export const EVC_USSD_MERCHANT = "62271";

/** Builds the exact USSD string, e.g. *789*62271*5.50# */
export function evcUssdCode(total: number): string {
  const amount = Math.max(0, Math.round((Number(total) || 0) * 100) / 100).toFixed(2);
  return `*789*${EVC_USSD_MERCHANT}*${amount}#`;
}

/**
 * tel: deep link for the dialer. Only `*` and `#` are percent-encoded
 * (digits and "." stay literal). Raw `*` makes some QR scanners treat the
 * content as plain text and offer a web search; raw `#` is cut off as a
 * URL fragment.
 */
export function evcUssdTelLink(total: number): string {
  return `tel:${evcUssdCode(total).replace(/\*/g, "%2A").replace(/#/g, "%23")}`;
}
