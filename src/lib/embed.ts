import { parseMusicUrl } from "./parse-url";
import type { LinkType, Service } from "./types";

/** Convert a Spotify open URL into an embeddable player URL. */
export function toSpotifyEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("spotify.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const intlOffset = parts[0]?.startsWith("intl-") ? 1 : 0;
    let type = parts[intlOffset];
    let id = parts[intlOffset + 1]?.split("?")[0];

    if (type === "embed") {
      type = parts[intlOffset + 1];
      id = parts[intlOffset + 2]?.split("?")[0];
    }

    if (!type || !id) return null;
    if (!["track", "album", "playlist", "artist", "episode", "show"].includes(type)) {
      return null;
    }

    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch {
    return null;
  }
}

/** Convert an Apple Music URL into an embed.music.apple.com player URL. */
export function toAppleEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    if (
      !host.includes("music.apple.com") &&
      !host.includes("itunes.apple.com") &&
      !host.includes("embed.music.apple.com")
    ) {
      return null;
    }

    // Search URLs are not embeddable
    if (parsed.pathname.includes("/search")) return null;

    if (host.includes("embed.music.apple.com")) {
      return parsed.toString();
    }

    parsed.hostname = "embed.music.apple.com";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function embedUrlForService(
  url: string | undefined,
  service: Service,
): string | null {
  if (!url) return null;
  return service === "spotify" ? toSpotifyEmbedUrl(url) : toAppleEmbedUrl(url);
}

export function isEmbeddableUrl(url: string): boolean {
  try {
    const parsed = parseMusicUrl(url);
    if (parsed.linkType === "artist") return false;
    const embed =
      parsed.service === "spotify"
        ? toSpotifyEmbedUrl(url)
        : toAppleEmbedUrl(url);
    return Boolean(embed);
  } catch {
    return false;
  }
}

export function embedIframeHeight(
  service: Service,
  linkType?: LinkType,
): number {
  if (service === "spotify") {
    if (linkType === "track") return 152;
    return 352;
  }
  // Apple Music embeds
  if (linkType === "track") return 175;
  return 450;
}
