import { unstable_cache } from "next/cache";
import { normalizeInput, parseMusicUrl } from "./parse-url";
import { resolveUrl } from "./resolve";
import type { CachedPlaylist, ResolveResult } from "./types";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const globalCache = globalThis as typeof globalThis & {
  __playlistBridgeResolve?: Map<string, ResolveResult>;
  __playlistBridgePlaylist?: Map<string, CachedPlaylist>;
  __playlistBridgeCacheFns?: Map<
    string,
    () => Promise<CachedPlaylist>
  >;
};

const resolveMemory =
  globalCache.__playlistBridgeResolve ??= new Map<string, ResolveResult>();
const playlistMemory =
  globalCache.__playlistBridgePlaylist ??= new Map<string, CachedPlaylist>();
const playlistCacheFns =
  globalCache.__playlistBridgeCacheFns ??= new Map<
    string,
    () => Promise<CachedPlaylist>
  >();

export function cacheKeyFromUrl(raw: string): string {
  const parsed = parseMusicUrl(raw);
  return `${parsed.service}:${parsed.linkType}:${parsed.id}`;
}

export async function getCachedResolve(
  rawUrl: string,
): Promise<ResolveResult> {
  const key = cacheKeyFromUrl(rawUrl);
  const memoryHit = resolveMemory.get(key);
  if (memoryHit) {
    return { ...memoryHit, cached: true };
  }

  const result = await unstable_cache(
    async () => {
      const resolved = await resolveUrl(normalizeInput(rawUrl));
      resolveMemory.set(key, resolved);
      return resolved;
    },
    ["resolve-v2", key],
    { revalidate: CACHE_TTL_SECONDS, tags: [`resolve:${key}`] },
  )();

  return result;
}

function getSharedPlaylistCache(key: string): () => Promise<CachedPlaylist> {
  let fn = playlistCacheFns.get(key);
  if (!fn) {
    fn = unstable_cache(
      async () => {
        const data = playlistMemory.get(key);
        if (!data) {
          throw new Error("PLAYLIST_CACHE_MISS");
        }
        return data;
      },
      ["playlist-v2", key],
      { revalidate: CACHE_TTL_SECONDS, tags: [`playlist:${key}`] },
    );
    playlistCacheFns.set(key, fn);
  }
  return fn;
}

export async function loadCachedPlaylist(
  rawUrl: string,
): Promise<CachedPlaylist | null> {
  const key = cacheKeyFromUrl(rawUrl);
  const memoryHit = playlistMemory.get(key);
  if (memoryHit) {
    return memoryHit;
  }

  try {
    const data = await getSharedPlaylistCache(key)();
    playlistMemory.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export async function saveCachedPlaylist(
  rawUrl: string,
  data: CachedPlaylist,
): Promise<void> {
  const key = cacheKeyFromUrl(rawUrl);
  playlistMemory.set(key, data);
  await getSharedPlaylistCache(key)();
}

export async function* streamCachedPlaylist(
  cached: CachedPlaylist,
): AsyncGenerator<
  import("./types").PlaylistEvent
> {
  const total = cached.tracks.length;

  yield {
    type: "start",
    data: { ...cached.metadata, cached: true },
  };

  let resolved = 0;
  for (const track of cached.tracks) {
    resolved += 1;
    yield { type: "track", data: track };
    yield { type: "progress", data: { resolved, total } };
  }

  yield { type: "complete" };
}
