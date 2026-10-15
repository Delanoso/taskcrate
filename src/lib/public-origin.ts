export function publicOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "taskcrate.co.za";
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() ||
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}
