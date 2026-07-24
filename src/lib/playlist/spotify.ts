import { fetchText } from "../http";
import { MAX_PLAYLIST_TRACKS, type PlaylistTrack } from "../types";

interface LegacyEmbedTrack {
  title?: string;
  subtitle?: string;
  uri?: string;
}

interface LegacyEmbedData {
  name?: string;
  images?: { url: string }[];
  tracks?: LegacyEmbedTrack[];
}

interface NextDataTrack {
  uri?: string;
  title?: string;
  subtitle?: string;
}

interface NextDataEntity {
  name?: string;
  title?: string;
  coverArt?: { sources?: { url: string }[] };
  trackList?: NextDataTrack[];
}

function trackIdFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const parts = uri.split(":");
  return parts[parts.length - 1];
}

function buildEmbedUrl(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const intlOffset =
    parts[0]?.startsWith("intl-") ? 1 : 0;
  const type = parts[intlOffset];
  const id = parts[intlOffset + 1];
  if (!type || !id) {
    throw new Error("Invalid Spotify playlist URL");
  }
  return `https://open.spotify.com/embed/${type}/${id}`;
}

function extractLegacyJson(html: string): LegacyEmbedData | null {
  const match = html.match(
    new RegExp(
      '<script id="resource" type="application/json">([\\s\\S]*?)</script>',
    ),
  );
  if (!match?.[1]) return null;

  try {
    return JSON.parse(match[1]) as LegacyEmbedData;
  } catch {
    return null;
  }
}

function extractNextData(html: string): NextDataEntity | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) return null;

  try {
    const data = JSON.parse(match[1]) as {
      props?: { pageProps?: { state?: { data?: { entity?: NextDataEntity } } } };
    };
    return data.props?.pageProps?.state?.data?.entity ?? null;
  } catch {
    return null;
  }
}

function tracksFromLegacy(data: LegacyEmbedData): PlaylistTrack[] {
  return (data.tracks ?? []).slice(0, MAX_PLAYLIST_TRACKS).map((track) => {
    const id = trackIdFromUri(track.uri);
    return {
      title: track.title ?? "Unknown",
      artist: track.subtitle ?? "Unknown Artist",
      sourceUrl: id ? `https://open.spotify.com/track/${id}` : undefined,
    };
  });
}

function tracksFromNextData(entity: NextDataEntity): PlaylistTrack[] {
  return (entity.trackList ?? []).slice(0, MAX_PLAYLIST_TRACKS).map((track) => {
    const id = trackIdFromUri(track.uri);
    return {
      title: track.title ?? "Unknown",
      artist: track.subtitle ?? "Unknown Artist",
      sourceUrl: id ? `https://open.spotify.com/track/${id}` : undefined,
    };
  });
}

export async function fetchSpotifyPlaylist(url: string): Promise<{
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
}> {
  const embedUrl = buildEmbedUrl(url);
  const html = await fetchText(embedUrl);

  const nextEntity = extractNextData(html);
  if (nextEntity?.trackList?.length) {
    return {
      title: nextEntity.name ?? nextEntity.title ?? "Spotify Playlist",
      artwork: nextEntity.coverArt?.sources?.[0]?.url,
      tracks: tracksFromNextData(nextEntity),
    };
  }

  const legacy = extractLegacyJson(html);
  if (legacy?.tracks?.length) {
    return {
      title: legacy.name ?? "Spotify Playlist",
      artwork: legacy.images?.[0]?.url,
      tracks: tracksFromLegacy(legacy),
    };
  }

  if (nextEntity) {
    return {
      title: nextEntity.name ?? nextEntity.title ?? "Spotify Playlist",
      artwork: nextEntity.coverArt?.sources?.[0]?.url,
      tracks: tracksFromNextData(nextEntity),
    };
  }

  throw new Error("Could not parse Spotify playlist embed");
}

export async function fetchSpotifyPlaylistPreview(url: string): Promise<{
  title: string;
  artwork?: string;
}> {
  const embedUrl = buildEmbedUrl(url);
  const html = await fetchText(embedUrl);

  const nextEntity = extractNextData(html);
  if (nextEntity) {
    return {
      title: nextEntity.name ?? nextEntity.title ?? "Spotify Playlist",
      artwork: nextEntity.coverArt?.sources?.[0]?.url,
    };
  }

  const legacy = extractLegacyJson(html);
  if (legacy) {
    return {
      title: legacy.name ?? "Spotify Playlist",
      artwork: legacy.images?.[0]?.url,
    };
  }

  throw new Error("Could not parse Spotify playlist embed");
}
