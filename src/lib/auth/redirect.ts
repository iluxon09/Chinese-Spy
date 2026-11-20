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
