import { fetchText } from "../http";
import { MAX_PLAYLIST_TRACKS, type PlaylistTrack } from "../types";

interface SpotifyEmbedTrack {
  title?: string;
  subtitle?: string;
  uri?: string;
}

interface SpotifyEmbedData {
  name?: string;
  images?: { url: string }[];
  tracks?: SpotifyEmbedTrack[];
  html?: string;
}

function extractEmbedJson(html: string): SpotifyEmbedData | null {
  const match = html.match(
    new RegExp(
      '<script id="resource" type="application/json">([\\s\\S]*?)</script>',
    ),
  );
  if (!match?.[1]) return null;

  try {
    return JSON.parse(match[1]) as SpotifyEmbedData;
  } catch {
    return null;
  }
}

function trackIdFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const parts = uri.split(":");
  return parts[parts.length - 1];
}

export async function fetchSpotifyPlaylist(url: string): Promise<{
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
}> {
  const embedUrl = url.includes("/embed/")
    ? url
    : url.replace(
        "open.spotify.com/",
        "open.spotify.com/embed/",
      );

  const html = await fetchText(embedUrl);
  const data = extractEmbedJson(html);

  if (!data) {
    throw new Error("Could not parse Spotify playlist embed");
  }

  const tracks: PlaylistTrack[] = (data.tracks ?? [])
    .slice(0, MAX_PLAYLIST_TRACKS)
    .map((track) => {
      const id = trackIdFromUri(track.uri);
      return {
        title: track.title ?? "Unknown",
        artist: track.subtitle ?? "Unknown Artist",
        sourceUrl: id
          ? `https://open.spotify.com/track/${id}`
          : undefined,
      };
    });

  return {
    title: data.name ?? "Spotify Playlist",
    artwork: data.images?.[0]?.url,
    tracks,
  };
}
