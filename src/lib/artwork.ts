/** Normalize artwork URLs for link previews (HTTPS, higher resolution). */
export function normalizeArtworkUrl(url?: string): string | undefined {
  if (!url) return undefined;

  let normalized = url.trim();
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }

  // iTunes / Apple Music thumbnails
  normalized = normalized.replace("100x100bb", "600x600bb");
  normalized = normalized.replace("200x200bb", "600x600bb");

  // Spotify CDN — request larger cover when size is in the path
  normalized = normalized.replace(
    /\/image\/ab67616d0000b273/,
    "/image/ab67616d00001e02",
  );

  return normalized;
}
