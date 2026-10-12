/**
 * Builds a WhatsApp click-to-chat link with a tenant-branded secure document URL.
 * Production: swap for Meta WhatsApp Business Cloud API templates + webhooks.
 */
export function buildWhatsAppShareLink(input: {
  organizationSlug: string;
  documentType: string;
  documentId: string;
  recipientHint?: string;
  businessPhoneE164?: string;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  const path = `/s/${input.organizationSlug}/${input.documentType}/${input.documentId}`;
  const secureUrl = `${base}${path}`;

  const message = [
    input.recipientHint ? `Hi ${input.recipientHint},` : "Hello,",
    "",
    `Please review this secure ${input.documentType.replace(/-/g, " ")} from ${input.organizationSlug}:`,
    secureUrl,
    "",
    "This link is unique to your organization.",
  ].join("\n");

  const phone =
    input.businessPhoneE164 ??
    process.env.WHATSAPP_BUSINESS_PHONE?.replace(/\D/g, "") ??
    "";

  if (!phone) {
    return {
      secureUrl,
      whatsAppUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
      message,
    };
  }

  return {
    secureUrl,
    whatsAppUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    message,
  };
}
