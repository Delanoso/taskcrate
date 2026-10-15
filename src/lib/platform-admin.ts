export function platformAdminEmail() {
  return (process.env.PLATFORM_ADMIN_EMAIL ?? "erich@delanosolutions.co.za").toLowerCase();
}

export function isPlatformAdmin(user: { email: string; platformAdmin?: boolean } | null | undefined) {
  if (!user) return false;
  return user.platformAdmin === true || user.email.toLowerCase() === platformAdminEmail();
}

export function alertEmail() {
  return process.env.ALERT_EMAIL ?? "erich@delanosolutions.co.za";
}
