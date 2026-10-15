import { createHash } from "crypto";
import { RENT_ZAR } from "@/data/products";
import { isAcceptedCharge, monthQuote } from "@/lib/pricing";

/** PayFast expects PHP urlencode: spaces as +, hex in uppercase. */
export function payfastEncode(value: string, trim = true) {
  const raw = trim ? value.trim() : value;
  return encodeURIComponent(raw)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~")
    .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());
}

export function payfastParamString(entries: Array<[string, string]>) {
  return entries
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${payfastEncode(value)}`)
    .join("&");
}

export function payfastItnString(entries: Array<[string, string]>) {
  return entries.map(([key, value]) => `${key}=${payfastEncode(value, false)}`).join("&");
}

export function payfastItnSignature(entries: Array<[string, string]>, passphrase?: string) {
  let param = payfastItnString(entries);
  if (passphrase) param += `&passphrase=${payfastEncode(passphrase)}`;
  return createHash("md5").update(param).digest("hex");
}
export function payfastSignature(fields: Record<string, string>, passphrase?: string) {
  let param = payfastParamString(Object.entries(fields));
  if (passphrase) param += `&passphrase=${payfastEncode(passphrase)}`;
  return createHash("md5").update(param).digest("hex");
}

export function payfastHost() {
  return process.env.PAYFAST_SANDBOX === "false" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
}

export function payfastConfigured() {
  return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

export function buildPayfastFields(input: {
  appUrl: string;
  productSlug: string;
  productName: string;
  email: string;
  fullName: string;
  companyName: string;
}) {
  const quote = monthQuote();
  return {
    merchant_id: process.env.PAYFAST_MERCHANT_ID ?? "",
    merchant_key: process.env.PAYFAST_MERCHANT_KEY ?? "",
    return_url: `${input.appUrl}/checkout/success?provider=payfast&product=${input.productSlug}`,
    cancel_url: `${input.appUrl}/products/${input.productSlug}`,
    notify_url: `${input.appUrl}/api/webhooks/payfast`,
    name_first: input.fullName.split(" ")[0] ?? input.fullName,
    name_last: input.fullName.split(" ").slice(1).join(" ") || "Customer",
    email_address: input.email,
    m_payment_id: `${input.productSlug}-${Date.now()}`,
    amount: quote.amount.toFixed(2),
    item_name: `${input.productName} — monthly rent`,
    custom_str1: input.productSlug,
    custom_str2: input.email,
    custom_str3: input.companyName,
    custom_str4: input.fullName,
    subscription_type: "1",
    billing_date: quote.billingDate,
    recurring_amount: RENT_ZAR.toFixed(2),
    frequency: "3",
    cycles: "0",
  };
}

export function payfastFormHtml(fields: Record<string, string>) {
  const action = `https://${payfastHost()}/eng/process`;
  const inputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
    .join("");
  return `<!doctype html><html><body><p>Redirecting to PayFast…</p><form id="pf" action="${action}" method="post">${inputs}</form><script>document.getElementById('pf').submit()</script></body></html>`;
}

export async function confirmPayfastItn(paramString: string) {
  const res = await fetch(`https://${payfastHost()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: paramString,
  });
  const text = (await res.text()).trim();
  return text === "VALID";
}

export function amountMatchesRent(amountGross: string) {
  return isAcceptedCharge(amountGross);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
