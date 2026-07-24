import { fetchText } from "../http";
import { MAX_PLAYLIST_TRACKS, type PlaylistTrack } from "../types";

interface SchemaTrack {
  name?: string;
  byArtist?: { name?: string } | { name?: string }[];
  url?: string;
  audio?: {
    name?: string;
    thumbnailUrl?: string;
  };
}

interface SchemaPlaylist {
  "@type"?: string | string[];
  name?: string;
  image?: string | string[];
  numTracks?: number;
  track?: SchemaTrack | SchemaTrack[];
  url?: string;
}

function hasType(value: string | string[] | undefined, type: string): boolean {
  if (!value) return false;
  return Array.isArray(value) ? value.includes(type) : value === type;
}

function extractJsonLd(html: string): SchemaPlaylist | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim()) as
        | SchemaPlaylist
        | SchemaPlaylist[]
        | { "@graph"?: SchemaPlaylist[] };

      const items: SchemaPlaylist[] = Array.isArray(parsed)
        ? parsed
        : parsed && "@graph" in parsed && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]!
          : [parsed as SchemaPlaylist];

      const playlist = items.find(
        (item) =>
          hasType(item["@type"], "MusicPlaylist") ||
          hasType(item["@type"], "ItemList"),
      );
      if (playlist) return playlist;
    } catch {
      continue;
    }
  }

  return null;
}

function extractOgMeta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function normalizeArtwork(image?: string | string[]): string | undefined {
  if (!image) return undefined;
  return Array.isArray(image) ? image[0] : image;
}

function normalizeArtist(byArtist?: SchemaTrack["byArtist"]): string | undefined {
  if (!byArtist) return undefined;
  if (Array.isArray(byArtist)) {
    const names = byArtist.map((a) => a.name).filter(Boolean);
    return names.length ? names.join(", ") : undefined;
  }
  return byArtist.name;
}

function tracksFromSchema(schema: SchemaPlaylist): PlaylistTrack[] {
  const rawTracks = schema.track
    ? Array.isArray(schema.track)
      ? schema.track
      : [schema.track]
    : [];

  return rawTracks.slice(0, MAX_PLAYLIST_TRACKS).map((track) => ({
    title: track.name ?? track.audio?.name ?? "Unknown",
    artist: normalizeArtist(track.byArtist) ?? "Unknown Artist",
    sourceUrl: track.url,
  }));
}

export async function fetchApplePlaylist(url: string): Promise<{
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
}> {
  const html = await fetchText(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const schema = extractJsonLd(html);
  if (!schema) {
    throw new Error("Could not parse Apple Music playlist metadata");
  }

  const tracks = tracksFromSchema(schema);
  if (tracks.length === 0) {
    throw new Error("Apple Music playlist contained no tracks");
  }

  return {
    title:
      schema.name ??
      extractOgMeta(html, "og:title") ??
      "Apple Music Playlist",
    artwork:
      normalizeArtwork(schema.image) ?? extractOgMeta(html, "og:image"),
    tracks,
  };
}

export async function fetchApplePlaylistPreview(url: string): Promise<{
  title: string;
  artwork?: string;
}> {
  const html = await fetchText(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const schema = extractJsonLd(html);

  if (!schema) {
    const title = extractOgMeta(html, "og:title");
    const artwork = extractOgMeta(html, "og:image");
    if (title || artwork) {
      return {
        title: title ?? "Apple Music Playlist",
        artwork,
      };
    }
    throw new Error("Could not parse Apple Music playlist metadata");
  }

  return {
    title: schema.name ?? extractOgMeta(html, "og:title") ?? "Apple Music Playlist",
    artwork:
      normalizeArtwork(schema.image) ?? extractOgMeta(html, "og:image"),
  };
}
