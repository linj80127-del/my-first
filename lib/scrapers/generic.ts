// Stray control bytes (outside plain whitespace) are never legitimate in a product name —
// their presence means something upstream failed to decode cleanly.
const CONTROL_CHAR_RE = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");

// Catches text that failed to decode cleanly (replacement chars, stray control bytes) so
// it never reaches the UI — a missing promo is far less confusing than a garbled one.
export function looksGarbled(text: string): boolean {
  if (text.includes("�")) return true;
  if (CONTROL_CHAR_RE.test(text)) return true;
  return false;
}
