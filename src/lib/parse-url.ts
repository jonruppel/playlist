import type { LinkType, ParsedUrl, Service } from "./types";

export class UrlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlParseError";
  }
}

export function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new UrlParseError("Please enter a URL");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new UrlParseError("Invalid URL format");
  }

  return parsed.toString();
}

export function parseMusicUrl(raw: string): ParsedUrl {
  const url = normalizeInput(raw);
  const parsed = new URL(url);

  if (parsed.hostname.includes("spotify.com")) {
    return parseSpotifyUrl(url, parsed);
  }

  if (
    parsed.hostname.includes("music.apple.com") ||
    parsed.hostname.includes("itunes.apple.com")
  ) {
    return parseAppleUrl(url, parsed);
  }

  throw new UrlParseError(
    "Unsupported URL. Please use a Spotify or Apple Music link.",
  );
}

function parseSpotifyUrl(url: string, parsed: URL): ParsedUrl {
  const parts = parsed.pathname.split("/").filter(Boolean);
  const intlIndex = parts[0] === "intl-fr" || parts[0]?.startsWith("intl-") ? 1 : 0;
  const type = parts[intlIndex] as LinkType | undefined;
  const id = parts[intlIndex + 1]?.split("?")[0];

  if (!type || !id) {
    throw new UrlParseError("Could not parse Spotify URL");
  }

  if (!["track", "album", "artist", "playlist"].includes(type)) {
    throw new UrlParseError(`Unsupported Spotify link type: ${type}`);
  }

  return {
    service: "spotify",
    linkType: type,
    url,
    id,
  };
}

function parseAppleUrl(url: string, parsed: URL): ParsedUrl {
  const parts = parsed.pathname.split("/").filter(Boolean);

  const songIndex = parts.indexOf("song");
  if (songIndex !== -1 && parts[songIndex + 1]) {
    const id = parts[songIndex + 1].split("?")[0];
    return {
      service: "apple",
      linkType: "track",
      url,
      id,
    };
  }

  const trackId = parsed.searchParams.get("i");
  const albumIndex = parts.indexOf("album");
  if (albumIndex !== -1 && parts[albumIndex + 1]) {
    const id = parts[albumIndex + 1].split("?")[0];
    if (trackId) {
      return {
        service: "apple",
        linkType: "track",
        url,
        id: trackId,
        trackId,
      };
    }
    return {
      service: "apple",
      linkType: "album",
      url,
      id,
    };
  }

  const artistIndex = parts.indexOf("artist");
  if (artistIndex !== -1 && parts[artistIndex + 1]) {
    const id = parts[artistIndex + 1].split("?")[0];
    return {
      service: "apple",
      linkType: "artist",
      url,
      id,
    };
  }

  const playlistIndex = parts.indexOf("playlist");
  if (playlistIndex !== -1 && parts[playlistIndex + 1]) {
    const id = parts[playlistIndex + 1].split("?")[0];
    return {
      service: "apple",
      linkType: "playlist",
      url,
      id,
    };
  }

  if (parts.some((p) => p.startsWith("pl."))) {
    const id = parts.find((p) => p.startsWith("pl."))!;
    return {
      service: "apple",
      linkType: "playlist",
      url,
      id,
    };
  }

  throw new UrlParseError("Could not parse Apple Music URL");
}

export function buildSpotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function buildAppleSearchUrl(query: string): string {
  return `https://music.apple.com/us/search?term=${encodeURIComponent(query)}`;
}

export function buildSpotifyUrl(linkType: LinkType, id: string): string {
  return `https://open.spotify.com/${linkType}/${id}`;
}

export function buildAppleMusicUrl(
  linkType: LinkType,
  id: string,
  country = "us",
): string {
  if (linkType === "playlist" && id.startsWith("pl.")) {
    return `https://music.apple.com/${country}/playlist/${id}`;
  }
  return `https://music.apple.com/${country}/${linkType}/${id}`;
}

export function isService(value: string): value is Service {
  return value === "spotify" || value === "apple";
}
