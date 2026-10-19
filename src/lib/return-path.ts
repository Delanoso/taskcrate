/** Keep sign-in returns inside TaskCrate. */
export function safeReturnPath(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  const path = trimmed.split("?")[0] ?? "";
  if (path === "/products" || path.startsWith("/products/")) return trimmed;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return trimmed;
  return null;
}
