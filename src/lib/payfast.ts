import { createHash } from "crypto";

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

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export type PayfastConfig = { sandbox: boolean; merchantId: string; merchantKey: string; passphrase: string; host: string };

/**
 * Live settings come from PAYFAST_MERCHANT_ID / _KEY / _PASSPHRASE.
 * Sandbox defaults to PayFast's public test merchant; PAYFAST_SANDBOX_* overrides it.
 */
export function payfastConfig(sandbox: boolean): PayfastConfig {
  if (sandbox) {
    return {
      sandbox: true,
      merchantId: process.env.PAYFAST_SANDBOX_MERCHANT_ID || "10000100",
      merchantKey: process.env.PAYFAST_SANDBOX_MERCHANT_KEY || "46f0cd694581a",
      passphrase: process.env.PAYFAST_SANDBOX_PASSPHRASE || "jt7NOE43FZPn",
      host: "sandbox.payfast.co.za",
    };
  }
  return {
    sandbox: false,
    merchantId: process.env.PAYFAST_MERCHANT_ID ?? "",
    merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "",
    passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
    host: "www.payfast.co.za",
  };
}

/** Recurring billing on PayFast only works with a passphrase on the merchant account. */
export function payfastReady(cfg: PayfastConfig) {
  return !!(cfg.merchantId && cfg.merchantKey && cfg.passphrase);
}

/** Checkout signature: fields in PayFast's documented order, blanks left out, passphrase last. */
export function checkoutSignature(fields: [string, string][], passphrase: string) {
  let s = fields.filter(([, v]) => v !== "").map(([k, v]) => `${k}=${payfastEncode(v)}`).join("&");
  if (passphrase) s += `&passphrase=${payfastEncode(passphrase)}`;
  return md5(s);
}

/** ITN signature: every posted field in the order received, up to (not including) signature. */
export function itnParamString(entries: [string, string][]) {
  return entries.map(([k, v]) => `${k}=${payfastEncode(v, false)}`).join("&");
}
export function itnSignature(entries: [string, string][], passphrase: string) {
  let s = itnParamString(entries);
  if (passphrase) s += `&passphrase=${payfastEncode(passphrase)}`;
  return md5(s);
}

export async function confirmWithPayfast(cfg: PayfastConfig, paramString: string) {
  const res = await fetch(`https://${cfg.host}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: paramString,
  });
  return (await res.text()).trim() === "VALID";
}

export function checkoutFormHtml(cfg: PayfastConfig, fields: [string, string][]) {
  const all: [string, string][] = [...fields.filter(([, v]) => v !== ""), ["signature", checkoutSignature(fields, cfg.passphrase)]];
  const inputs = all.map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}" />`).join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;padding:2rem;text-align:center"><p>Taking you to PayFast…</p><form id="pf" action="https://${cfg.host}/eng/process" method="post">${inputs}<noscript><button type="submit">Continue to PayFast</button></noscript></form><script>document.getElementById('pf').submit()</script></body></html>`;
}

/** Signed call to the PayFast subscriptions API (cancel, fetch). */
export async function payfastApi(cfg: PayfastConfig, method: "GET" | "PUT", path: string, body: Record<string, string> = {}) {
  const timestamp = `${new Date().toISOString().slice(0, 19)}+00:00`;
  const headers: Record<string, string> = { "merchant-id": cfg.merchantId, version: "v1", timestamp };
  const signed: Record<string, string> = { ...headers, ...body, passphrase: cfg.passphrase };
  const signature = md5(Object.keys(signed).sort().map((k) => `${k}=${payfastEncode(signed[k])}`).join("&"));
  const url = `https://api.payfast.co.za${path}${cfg.sandbox ? "?testing=true" : ""}`;
  const res = await fetch(url, {
    method,
    headers: { ...headers, signature, ...(method === "PUT" ? { "Content-Type": "application/json" } : {}) },
    body: method === "PUT" ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

/** Page where the payer replaces the card behind a debit order. */
export function updateCardUrl(cfg: PayfastConfig, token: string, returnUrl: string) {
  return `https://${cfg.host}/eng/recurring/update/${token}?return=${encodeURIComponent(returnUrl)}`;
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
