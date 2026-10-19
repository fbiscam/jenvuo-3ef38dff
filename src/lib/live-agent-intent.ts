/**
 * True when a visitor asks Ask Jenvu to talk to a real person, so the chat
 * hands over to live chat with the support team. Covers English and common
 * Roman Urdu/Hindi phrasing.
 */
const PATTERNS: RegExp[] = [
  /\b(live|human|real|support)\s+(agent|person|chat|operator|rep(resentative)?)\b/i,
  /\b(talk|speak|chat|connect|contact|reach)\s+(me\s+)?(to|with)?\s*(an?\s+|the\s+|your\s+|some\s+)?(human|person|agent|someone|somebody|support|team|staff|representative)s?\b/i,
  /\b(want|need|get)\s+(an?\s+|the\s+)?(human|real\s+person|agent|support\s+team)\b/i,
  /\b(agent|human|insaan|banda|bande|team)\s+(se|sa|say|sy|ko)\s+(baat|bat|contact|connect|milao|mila\s*do|jodo)\b/i,
  /\b(agent|human|support)\s+(chahiye|chaiye|chahye)\b/i,
  /\b(agent|human|insaan|banda|bande)\s+(se|sa|say|sy)\s+(baat|bat)\b/i,
  /\bliv(e)?\s*chat\b/i,
  /\b(customer\s+(support|service)\s+agent)\b/i,
];

export function wantsLiveAgent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return PATTERNS.some((p) => p.test(t));
}
