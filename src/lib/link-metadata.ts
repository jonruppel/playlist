import type { Metadata } from "next";
import { normalizeArtworkUrl } from "./artwork";
import { getCachedResolve, loadCachedPlaylist } from "./cache";
import { fetchJson } from "./http";
import { parseMusicUrl } from "./parse-url";
import { fetchApplePlaylistPreview } from "./playlist/apple";
import { fetchSpotifyPlaylistPreview } from "./playlist/spotify";
import type { LinkType } from "./types";

export interface SharePreview {
  title: string;
  artist?: string;
  artwork?: string;
  linkType: LinkType;
}

interface SpotifyOEmbed {
  title?: string;
  thumbnail_url?: string;
}

function parseOEmbedTitle(title?: string): { title: string; artist?: string } {
  if (!title) return { title: "Unknown" };
  const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  }
  return { title };
}

async function spotifyOEmbedPreview(
  url: string,
  linkType: LinkType,
): Promise<SharePreview | null> {
  try {
    const data = await fetchJson<SpotifyOEmbed>(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    );
    if (!data.thumbnail_url) return null;
    const parsed = parseOEmbedTitle(data.title);
    return {
      title: parsed.title,
      artist: parsed.artist,
      artwork: data.thumbnail_url,
      linkType,
    };
  } catch {
    return null;
  }
}

export async function getSharePreview(rawUrl: string): Promise<SharePreview | null> {
  try {
    const parsed = parseMusicUrl(rawUrl);

    if (parsed.linkType === "playlist") {
      const cached = await loadCachedPlaylist(rawUrl);
      if (cached) {
        return {
          title: cached.metadata.title,
          artwork: cached.metadata.artwork,
          linkType: "playlist",
        };
      }

      const preview =
        parsed.service === "spotify"
          ? await fetchSpotifyPlaylistPreview(parsed.url)
          : await fetchApplePlaylistPreview(parsed.url);

      return { ...preview, linkType: "playlist" };
    }

    const result = await getCachedResolve(rawUrl);
    return {
      title: result.title,
      artist: result.artist,
      artwork: result.artwork,
      linkType: result.linkType,
    };
  } catch {
    try {
      const parsed = parseMusicUrl(rawUrl);
      if (parsed.service === "spotify") {
        return await spotifyOEmbedPreview(parsed.url, parsed.linkType);
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export function getSiteBase(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "https://playlist-delta-eight.vercel.app"
  );
}

export function buildShareMetadata(
  preview: SharePreview,
  sourceUrl: string,
): Metadata {
  const siteBase = getSiteBase();
  const pageUrl = `${siteBase}/link?url=${encodeURIComponent(sourceUrl)}`;
  const artwork = normalizeArtworkUrl(preview.artwork);

  const headline = preview.artist
    ? `${preview.title} — ${preview.artist}`
    : preview.title;

  const description = preview.artist
    ? `Listen to “${preview.title}” by ${preview.artist} on Spotify and Apple Music.`
    : preview.linkType === "playlist"
      ? `Open “${preview.title}” on Spotify and Apple Music.`
      : `Listen to “${preview.title}” on Spotify and Apple Music.`;

  const images = artwork
    ? [
        {
          url: artwork,
          width: 1200,
          height: 1200,
          alt: preview.title,
          type: "image/jpeg",
        },
      ]
    : undefined;

  return {
    title: { absolute: `${headline} | Playlist Bridge` },
    description,
    openGraph: {
      title: preview.title,
      description,
      url: pageUrl,
      siteName: "Playlist Bridge",
      type: "website",
      locale: "en_US",
      images,
    },
    twitter: {
      card: artwork ? "summary_large_image" : "summary",
      title: preview.title,
      description,
      images: artwork ? [artwork] : undefined,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}
