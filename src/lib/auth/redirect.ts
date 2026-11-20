const INTERNAL_ORIGIN = "https://tilt.internal";

/** Accept only same-origin relative destinations from login redirect parameters. */
export function getSafeInternalPath(requested: string | null | undefined): string {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/";
  try {
    const destination = new URL(requested, INTERNAL_ORIGIN);
    return destination.origin === INTERNAL_ORIGIN
      ? destination.pathname + destination.search + destination.hash
      : "/";
  } catch {
    return "/";
  }
}

/**
 * Public revenue-model pages must remain reachable without an account.
 * Keep this allowlist narrow; the workspace and all other application routes
 * continue to require Supabase authentication.
 */
export function isPublicPricingPath(pathname: string): boolean {
  return pathname === "/pricing" || pathname.startsWith("/pricing/");
}
