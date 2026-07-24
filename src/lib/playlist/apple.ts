import { fetchText } from "../http";
import { MAX_PLAYLIST_TRACKS, type PlaylistTrack } from "../types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

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

interface SerializedTrackItem {
  id?: string;
  title?: string;
  artistName?: string;
  contentDescriptor?: {
    kind?: string;
    url?: string;
    identifiers?: { storeAdamID?: string };
  };
}

interface SerializedHeaderItem {
  id?: string;
  title?: string;
  artwork?: {
    dictionary?: {
      url?: string;
    };
  };
}

interface PlaylistPageResult {
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
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

function resolveArtworkTemplate(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace("{w}", "600")
    .replace("{h}", "600")
    .replace("{f}", "jpg");
}

function normalizeArtist(
  byArtist?: SchemaTrack["byArtist"],
): string | undefined {
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

function songUrlFromSerialized(item: SerializedTrackItem): string | undefined {
  const descriptor = item.contentDescriptor;
  if (descriptor?.url) return descriptor.url;
  const id = descriptor?.identifiers?.storeAdamID;
  if (id) return `https://music.apple.com/us/song/${id}`;
  return undefined;
}

/** User playlists often omit JSON-LD; tracks live in serialized-server-data. */
function extractFromSerializedServerData(
  html: string,
): PlaylistPageResult | null {
  const match = html.match(
    /<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) return null;

  try {
    const payload = JSON.parse(match[1]) as {
      data?: Array<{
        data?: {
          sections?: Array<{
            items?: Array<SerializedTrackItem & SerializedHeaderItem>;
            id?: string;
            itemKind?: string;
          }>;
        };
      }>;
    };

    const page = payload.data?.[0]?.data;
    const sections = page?.sections;
    if (!sections?.length) return null;

    const header = sections.find((section) =>
      section.items?.some((item) =>
        String(item.id ?? "").includes("playlist-detail-header"),
      ),
    )?.items?.[0];

    const trackSection = sections.find((section) => {
      const first = section.items?.[0];
      return (
        first?.artistName != null ||
        first?.contentDescriptor?.kind === "song" ||
        String(section.id ?? "").includes("track") ||
        String(first?.id ?? "").includes("track-lockup")
      );
    });

    const tracks: PlaylistTrack[] = (trackSection?.items ?? [])
      .filter(
        (item) =>
          item.title &&
          (item.contentDescriptor?.kind === "song" ||
            item.artistName != null ||
            String(item.id ?? "").includes("track-lockup")),
      )
      .slice(0, MAX_PLAYLIST_TRACKS)
      .map((item) => ({
        title: item.title ?? "Unknown",
        artist: item.artistName ?? "Unknown Artist",
        sourceUrl: songUrlFromSerialized(item),
      }));

    if (tracks.length === 0) return null;

    const title =
      header?.title ??
      extractOgMeta(html, "og:title")?.replace(/\s+by\s+.+\s+on Apple Music$/i, "") ??
      "Apple Music Playlist";

    const artwork =
      resolveArtworkTemplate(header?.artwork?.dictionary?.url) ??
      extractOgMeta(html, "og:image");

    return { title, artwork, tracks };
  } catch {
    return null;
  }
}

function extractFromSongLinks(html: string): PlaylistPageResult | null {
  const urls = [
    ...html.matchAll(
      /https:\/\/music\.apple\.com\/[a-z]{2}\/song\/[^"'\\]+/g,
    ),
  ].map((m) => m[0]);

  const unique = [...new Set(urls)].slice(0, MAX_PLAYLIST_TRACKS);
  if (unique.length === 0) return null;

  const tracks: PlaylistTrack[] = unique.map((sourceUrl) => {
    const parts = sourceUrl.split("/").filter(Boolean);
    const slug = parts[parts.length - 2] ?? "Unknown";
    const title = decodeURIComponent(slug).replace(/-/g, " ");
    return {
      title: title.replace(/\b\w/g, (c) => c.toUpperCase()),
      artist: "Unknown Artist",
      sourceUrl,
    };
  });

  return {
    title:
      extractOgMeta(html, "og:title")?.replace(
        /\s+by\s+.+\s+on Apple Music$/i,
        "",
      ) ?? "Apple Music Playlist",
    artwork: extractOgMeta(html, "og:image"),
    tracks,
  };
}

function fromJsonLd(
  html: string,
  schema: SchemaPlaylist,
): PlaylistPageResult | null {
  const tracks = tracksFromSchema(schema);
  if (tracks.length === 0) return null;

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

async function loadApplePlaylistPage(url: string): Promise<PlaylistPageResult> {
  const html = await fetchText(url, { headers: BROWSER_HEADERS });

  const schema = extractJsonLd(html);
  if (schema) {
    const fromSchema = fromJsonLd(html, schema);
    if (fromSchema) return fromSchema;
  }

  const fromSerialized = extractFromSerializedServerData(html);
  if (fromSerialized) return fromSerialized;

  const fromLinks = extractFromSongLinks(html);
  if (fromLinks) return fromLinks;

  throw new Error("Could not parse Apple Music playlist metadata");
}

export async function fetchApplePlaylist(url: string): Promise<{
  title: string;
  artwork?: string;
  tracks: PlaylistTrack[];
}> {
  return loadApplePlaylistPage(url);
}

export async function fetchApplePlaylistPreview(url: string): Promise<{
  title: string;
  artwork?: string;
}> {
  try {
    const page = await loadApplePlaylistPage(url);
    return { title: page.title, artwork: page.artwork };
  } catch {
    const html = await fetchText(url, { headers: BROWSER_HEADERS });
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
}
