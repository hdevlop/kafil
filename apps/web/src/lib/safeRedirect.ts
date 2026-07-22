const blockedPrefixes = ["/api", "/login", "/_next"];
const blockedExtensions =
  /\.(?:css|gif|ico|jpe?g|js|json|map|png|svg|webmanifest|webp)$/i;

export function getSafeRedirectPath(
  value: string | string[] | undefined,
  fallback = "/dashboard",
) {
  const path = Array.isArray(value) ? value[0] : value;

  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    blockedPrefixes.some((prefix) => path.startsWith(prefix)) ||
    blockedExtensions.test(path.split("?")[0] ?? path)
  ) {
    return fallback;
  }

  return path;
}
