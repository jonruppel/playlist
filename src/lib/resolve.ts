import { fetchJson } from "./http";
import {
  appleUrlFromItunes,
  appleUrlFromSearch,
  artworkFrom100,
  buildSpotifyFromItunes,
  findAppleForTrack,
  lookupItunesByUrl,
  searchItunes,
  spotifyUrlFromSearch,
} from "./itunes";
import { resolveWithOdesli } from "./odesli";
import {
  buildSpotifyUrl,
  parseMusicUrl,
  UrlParseError,
} from "./parse-url";
import {
  PLAYLIST_USE_STREAM,
  type LinkQuality,
  type LinkType,
  type PlatformLink,
  type ResolveResult,
  type Service,
} from "./types";

interface SpotifyOEmbed {
  title?: string;
  thumbnail_url?: string;
  provider_name?: string;
}

function worstQuality(
  ...qualities: (LinkQuality | undefined)[]
): LinkQuality {
  if (qualities.includes("fallback")) return "fallback";
  if (qualities.includes("search")) return "search";
  return "exact";
}

function platformLink(url: string, quality: LinkQuality): PlatformLink {
  return { url, quality };
}

async function getSpotifyOEmbed(url: string): Promise<SpotifyOEmbed | null> {
  try {
    return await fetchJson<SpotifyOEmbed>(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    );
  } catch {
    return null;
  }
}

function parseOEmbedTitle(title?: string): { title: string; artist?: string } {
  if (!title) return { title: "Unknown" };
  const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  }
  return { title };
}

export async function resolveUrl(rawUrl: string): Promise<ResolveResult> {
  const parsed = parseMusicUrl(rawUrl);

  if (parsed.linkType === "playlist") {
    const error = new Error(PLAYLIST_USE_STREAM);
    error.name = PLAYLIST_USE_STREAM;
    throw error;
  }

  const odesli = await resolveWithOdesli(parsed.url);

  if (parsed.service === "spotify") {
    return resolveSpotify(parsed, odesli);
  }

  return resolveApple(parsed, odesli);
}

async function resolveSpotify(
  parsed: ReturnType<typeof parseMusicUrl>,
  odesli: Awaited<ReturnType<typeof resolveWithOdesli>>,
): Promise<ResolveResult> {
  const oembed = await getSpotifyOEmbed(parsed.url);
  const { title: oembedTitle, artist: oembedArtist } = parseOEmbedTitle(
    oembed?.title,
  );

  let title = odesli?.title ?? oembedTitle;
  let artist = odesli?.artist ?? oembedArtist;
  let artwork = odesli?.artwork ?? oembed?.thumbnail_url;

  const spotify: PlatformLink = platformLink(
    odesli?.spotifyUrl ?? buildSpotifyUrl(parsed.linkType, parsed.id),
    odesli?.spotifyUrl ? "exact" : "exact",
  );

  let apple: PlatformLink | undefined;
  let appleQuality: LinkQuality = "search";

  if (odesli?.appleUrl) {
    apple = platformLink(odesli.appleUrl, "exact");
    appleQuality = "exact";
  } else if (parsed.linkType === "track" || parsed.linkType === "album") {
    const entity = parsed.linkType === "track" ? "song" : "album";
    const itunes = await searchItunes(
      artist ? `${title} ${artist}` : title,
      entity,
    );
    if (itunes) {
      const appleUrl = appleUrlFromItunes(itunes, parsed.linkType);
      if (appleUrl) {
        apple = platformLink(appleUrl, "exact");
        appleQuality = "exact";
        title = title || itunes.trackName || itunes.collectionName || title;
        artist = artist || itunes.artistName;
        artwork = artwork || artworkFrom100(itunes.artworkUrl100);
      }
    }
  }

  if (!apple) {
    apple = platformLink(appleUrlFromSearch(title, artist), "search");
    appleQuality = "search";
  }

  return {
    sourceUrl: parsed.url,
    sourceService: "spotify",
    linkType: parsed.linkType,
    title,
    artist,
    artwork,
    spotify,
    apple,
    linkQuality: worstQuality(spotify.quality, appleQuality),
  };
}

async function resolveApple(
  parsed: ReturnType<typeof parseMusicUrl>,
  odesli: Awaited<ReturnType<typeof resolveWithOdesli>>,
): Promise<ResolveResult> {
  const itunes = await lookupItunesByUrl(parsed.url);

  let title =
    odesli?.title ??
    itunes?.trackName ??
    itunes?.collectionName ??
    itunes?.artistName ??
    "Unknown";
  let artist = odesli?.artist ?? itunes?.artistName;
  let artwork =
    odesli?.artwork ?? artworkFrom100(itunes?.artworkUrl100);

  const apple: PlatformLink = platformLink(
    odesli?.appleUrl ?? parsed.url,
    odesli?.appleUrl ? "exact" : "exact",
  );

  let spotify: PlatformLink | undefined;
  let spotifyQuality: LinkQuality = "search";

  if (odesli?.spotifyUrl) {
    spotify = platformLink(odesli.spotifyUrl, "exact");
    spotifyQuality = "exact";
  } else if (itunes) {
    const searchUrl = buildSpotifyFromItunes(itunes, parsed.linkType);
    const odesliFromApple = await resolveWithOdesli(
      appleUrlFromItunes(itunes, parsed.linkType) ?? parsed.url,
    );
    if (odesliFromApple?.spotifyUrl) {
      spotify = platformLink(odesliFromApple.spotifyUrl, "exact");
      spotifyQuality = "exact";
    } else {
      spotify = platformLink(searchUrl, "search");
      spotifyQuality = "search";
    }
  } else {
    spotify = platformLink(spotifyUrlFromSearch(title, artist), "search");
    spotifyQuality = "search";
  }

  return {
    sourceUrl: parsed.url,
    sourceService: "apple",
    linkType: parsed.linkType,
    title,
    artist,
    artwork,
    spotify,
    apple,
    linkQuality: worstQuality(spotifyQuality, apple.quality),
  };
}

export async function resolveTrackByMetadata(
  title: string,
  artist: string,
  sourceService: Service,
): Promise<{
  spotify?: PlatformLink;
  apple?: PlatformLink;
  linkQuality: LinkQuality;
}> {
  const odesliQuery =
    sourceService === "apple"
      ? await findAppleForTrack(title, artist)
      : null;

  if (odesliQuery) {
    const odesli = await resolveWithOdesli(odesliQuery.url);
    if (odesli?.spotifyUrl || odesli?.appleUrl) {
      return {
        spotify: odesli.spotifyUrl
          ? platformLink(odesli.spotifyUrl, "exact")
          : platformLink(spotifyUrlFromSearch(title, artist), "search"),
        apple: odesli.appleUrl
          ? platformLink(odesli.appleUrl, "exact")
          : platformLink(odesliQuery.url, "exact"),
        linkQuality: "exact",
      };
    }
  }

  const itunes = await searchItunes(`${title} ${artist}`, "song");
  const appleUrl =
    itunes?.trackViewUrl ?? appleUrlFromSearch(title, artist);
  const odesli = await resolveWithOdesli(appleUrl);

  const spotify = odesli?.spotifyUrl
    ? platformLink(odesli.spotifyUrl, "exact")
    : platformLink(spotifyUrlFromSearch(title, artist), "search");

  const apple = odesli?.appleUrl
    ? platformLink(odesli.appleUrl, "exact")
    : platformLink(appleUrl, itunes ? "exact" : "search");

  return {
    spotify,
    apple,
    linkQuality: worstQuality(spotify.quality, apple.quality),
  };
}

export { UrlParseError, PLAYLIST_USE_STREAM };
