export function getSafeFileUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/");
  }
  return url;
}
