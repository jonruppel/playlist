import type { Service } from "./types";

export function buildShareUrl(sourceUrl: string, origin?: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    origin?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return `${base}/link?url=${encodeURIComponent(sourceUrl)}`;
}

export function getRequestOrigin(request: Request): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export function serviceLabel(service: Service): string {
  return service === "spotify" ? "Spotify" : "Apple Music";
}
