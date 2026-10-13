/** SA cellphone to the international digits wa.me expects (0821234567 -> 27821234567). */
export function waPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  if (digits.length === 9 && /^[6-8]/.test(digits)) return `27${digits}`;
  return digits;
}

/** Looks like a phone number we can open a WhatsApp chat with. */
export const isWaPhone = (phone: string | null | undefined) => waPhone(phone).length >= 11;

/** wa.me click-to-chat link; without a usable number WhatsApp asks who to send it to. */
export function waLink(phone: string | null | undefined, text: string) {
  const p = waPhone(phone);
  return `https://wa.me/${p.length >= 11 ? p : ""}?text=${encodeURIComponent(text)}`;
}
