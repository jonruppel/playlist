import { fetchText } from "../http";
import { MAX_PLAYLIST_TRACKS, type PlaylistTrack } from "../types";

interface SchemaTrack {
  name?: string;
  byArtist?: { name?: string } | { name?: string }[];
  url?: string;
}

interface SchemaPlaylist {
  "@type"?: string;
  name?: string;
  image?: string | string[];
  numTracks?: number;
  track?: SchemaTrack | SchemaTrack[];
}

function extractJsonLd(html: string): SchemaPlaylist | null {
  const scripts = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );

  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]) as SchemaPlaylist | SchemaPlaylist[];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const playlist = items.find(
        (item) =>
          item["@type"] === "MusicPlaylist" ||
          item["@type"] === "ItemList",
      );
      if (playlist) return playlist;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeArtwork(image?: string | string[]): string | undefined {
  if (!image) return undefined;
  return Array.isArray(image) ? image[0] : image;
}

function normalizeArtist(
  byArtist?: SchemaTrack["byArtist"],
): string {
  if (!byArtist) return "Unknown Artist";
  if (Array.isArray(byArtist)) {
    return byArtist.map((a) => a.name).filter(Boolean).join(", ") || "Unknown Artist";
  }
  return byArtist.name ?? "Unknown Artist";
}

export async function fetchApplePlaylist(url: string): Promise<{
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
}> {
  const html = await fetchText(url);
  const schema = extractJsonLd(html);

  if (!schema) {
    throw new Error("Could not parse Apple Music playlist metadata");
  }

  const rawTracks = schema.track
    ? Array.isArray(schema.track)
      ? schema.track
      : [schema.track]
    : [];

  const tracks: PlaylistTrack[] = rawTracks
    .slice(0, MAX_PLAYLIST_TRACKS)
    .map((track) => ({
      title: track.name ?? "Unknown",
      artist: normalizeArtist(track.byArtist),
      sourceUrl: track.url,
    }));

  return {
    title: schema.name ?? "Apple Music Playlist",
    artwork: normalizeArtwork(schema.image),
    tracks,
  };
}
