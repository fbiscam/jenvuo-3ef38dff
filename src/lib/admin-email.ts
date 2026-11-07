// Pure rules for the admin Email box (tested in admin-email.test.ts).
import { z } from "zod";

export const EMAIL_BOXES = {
  support: { label: "Jenvu Support", address: "support@jenvu.com" },
  sales: { label: "Jenvu Sales", address: "sales@jenvu.com" },
} as const;

export type EmailBox = keyof typeof EMAIL_BOXES;

/** One recipient per send — lists and bulk mail are not allowed. */
export const adminEmailInput = z.object({
  box: z.enum(["support", "sales"]),
  to: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Enter one valid email address")
    .refine((v) => !/[,;\s]/.test(v), "Send to one address at a time"),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Message is required").max(20000),
  contactMessageId: z.string().uuid().optional(),
});

export type AdminEmailInput = z.infer<typeof adminEmailInput>;

export function boxSender(box: EmailBox) {
  const b = EMAIL_BOXES[box];
  return { from: { name: b.label, local: box }, replyTo: b.address, label: b.label };
}
