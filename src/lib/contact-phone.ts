/**
 * WhatsApp number check for the Contact form (required there).
 * Accepts digits with optional leading +, spaces, dashes, dots and brackets;
 * must hold 7–15 digits (E.164 length).
 */
export function isValidWhatsApp(raw: string): boolean {
  const v = raw.trim();
  if (!/^\+?[()\-.\s\d]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
