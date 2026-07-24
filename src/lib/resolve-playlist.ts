import {
  loadCachedPlaylist,
  saveCachedPlaylist,
  streamCachedPlaylist,
  getCachedResolve,
} from "./cache";
import { parseMusicUrl } from "./parse-url";
import { fetchApplePlaylist } from "./playlist/apple";
import { fetchSpotifyPlaylist } from "./playlist/spotify";
import { resolveTrackByMetadata } from "./resolve";
import type {
  CachedPlaylist,
  LinkQuality,
  PlatformLink,
  PlaylistEvent,
} from "./types";

async function* resolvePlaylistUncached(
  rawUrl: string,
): AsyncGenerator<PlaylistEvent> {
  const parsed = parseMusicUrl(rawUrl);

  if (parsed.linkType !== "playlist") {
    yield {
      type: "error",
      data: { message: "URL is not a playlist" },
    };
    return;
  }

  try {
    const playlistData =
      parsed.service === "spotify"
        ? await fetchSpotifyPlaylist(parsed.url)
        : await fetchApplePlaylist(parsed.url);

    const total = playlistData.tracks.length;

    yield {
      type: "start",
      data: {
        title: playlistData.title,
        artwork: playlistData.artwork,
        totalTracks: total,
        sourceService: parsed.service,
        sourceUrl: parsed.url,
      },
    };

    let resolved = 0;

    for (const track of playlistData.tracks) {
      let spotify: PlatformLink | undefined;
      let apple: PlatformLink | undefined;
      let linkQuality: LinkQuality = "fallback";

      try {
        if (track.sourceUrl) {
          try {
            const result = await getCachedResolve(track.sourceUrl);
            spotify = result.spotify;
            apple = result.apple;
            linkQuality = result.linkQuality;
          } catch {
            const result = await resolveTrackByMetadata(
              track.title,
              track.artist,
              parsed.service,
            );
            spotify = result.spotify;
            apple = result.apple;
            linkQuality = result.linkQuality;
          }
        } else {
          const result = await resolveTrackByMetadata(
            track.title,
            track.artist,
            parsed.service,
          );
          spotify = result.spotify;
          apple = result.apple;
          linkQuality = result.linkQuality;
        }
      } catch {
        linkQuality = "fallback";
      }

      resolved += 1;
      yield {
        type: "track",
        data: {
          title: track.title,
          artist: track.artist,
          spotify,
          apple,
          linkQuality,
        },
      };
      yield { type: "progress", data: { resolved, total } };
    }

    yield { type: "complete" };
  } catch (error) {
    yield {
      type: "error",
      data: {
        message:
          error instanceof Error ? error.message : "Failed to resolve playlist",
      },
    };
  }
}

export async function* resolvePlaylistStream(
  rawUrl: string,
): AsyncGenerator<PlaylistEvent> {
  const cached = await loadCachedPlaylist(rawUrl);
  if (cached) {
    yield* streamCachedPlaylist(cached);
    return;
  }

  const collected: CachedPlaylist = {
    metadata: {
      title: "",
      totalTracks: 0,
      sourceService: "spotify",
      sourceUrl: rawUrl,
    },
    tracks: [],
  };

  for await (const event of resolvePlaylistUncached(rawUrl)) {
    if (event.type === "start") {
      collected.metadata = event.data;
    } else if (event.type === "track") {
      collected.tracks.push(event.data);
    } else if (event.type === "complete") {
      await saveCachedPlaylist(rawUrl, collected);
    }

    yield event;
  }
}
