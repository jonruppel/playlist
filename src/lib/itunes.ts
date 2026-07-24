import { fetchJson } from "./http";
import type { LinkType } from "./types";
import {
  buildAppleMusicUrl,
  buildAppleSearchUrl,
  buildSpotifySearchUrl,
  buildSpotifyUrl,
} from "./parse-url";

interface iTunesResult {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  artistViewUrl?: string;
  trackId?: number;
  collectionId?: number;
  artistId?: number;
}

interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesResult[];
}

function artworkFrom100(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace("100x100bb", "600x600bb");
}

export async function searchItunes(
  term: string,
  entity: "song" | "album" | "musicArtist" = "song",
): Promise<iTunesResult | null> {
  try {
    const data = await fetchJson<iTunesSearchResponse>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=1&country=us`,
    );
    return data.results[0] ?? null;
  } catch {
    return null;
  }
}

export async function lookupItunesByUrl(
  appleUrl: string,
): Promise<iTunesResult | null> {
  try {
    const data = await fetchJson<iTunesSearchResponse>(
      `https://itunes.apple.com/lookup?url=${encodeURIComponent(appleUrl)}`,
    );
    return data.results[0] ?? null;
  } catch {
    return null;
  }
}

export function appleUrlFromItunes(
  result: iTunesResult,
  linkType: LinkType,
): string | undefined {
  if (linkType === "track") {
    return result.trackViewUrl;
  }
  if (linkType === "album") {
    return result.collectionViewUrl;
  }
  if (linkType === "artist") {
    return result.artistViewUrl;
  }
  return result.trackViewUrl ?? result.collectionViewUrl;
}

export function spotifyUrlFromSearch(title: string, artist?: string): string {
  const query = artist ? `${title} ${artist}` : title;
  return buildSpotifySearchUrl(query);
}

export function appleUrlFromSearch(title: string, artist?: string): string {
  const query = artist ? `${title} ${artist}` : title;
  return buildAppleSearchUrl(query);
}

export async function findAppleForTrack(
  title: string,
  artist?: string,
): Promise<{ url: string; artwork?: string } | null> {
  const term = artist ? `${title} ${artist}` : title;
  const result = await searchItunes(term, "song");
  if (!result?.trackViewUrl) return null;
  return {
    url: result.trackViewUrl,
    artwork: artworkFrom100(result.artworkUrl100),
  };
}

export async function findSpotifyForTrack(
  title: string,
  artist?: string,
): Promise<{ url: string; artwork?: string } | null> {
  const apple = await findAppleForTrack(title, artist);
  if (!apple) return null;

  const odesli = await import("./odesli").then((m) =>
    m.resolveWithOdesli(apple.url),
  );
  if (odesli?.spotifyUrl) {
    return { url: odesli.spotifyUrl, artwork: odesli.artwork ?? apple.artwork };
  }
  return { url: spotifyUrlFromSearch(title, artist) };
}

export function buildSpotifyFromItunes(
  result: iTunesResult,
  linkType: LinkType,
): string {
  if (linkType === "track" && result.trackName) {
    return spotifyUrlFromSearch(result.trackName, result.artistName);
  }
  if (linkType === "album" && result.collectionName) {
    return spotifyUrlFromSearch(result.collectionName, result.artistName);
  }
  if (linkType === "artist" && result.artistName) {
    return buildSpotifySearchUrl(result.artistName);
  }
  return buildSpotifySearchUrl(result.trackName ?? "music");
}

export function buildAppleFromMetadata(
  linkType: LinkType,
  id: string,
): string {
  return buildAppleMusicUrl(linkType, id);
}

export function buildSpotifyFromMetadata(
  linkType: LinkType,
  id: string,
): string {
  return buildSpotifyUrl(linkType, id);
}

export { artworkFrom100 };
