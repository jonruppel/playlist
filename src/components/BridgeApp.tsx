"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmbedPlayer, { type EmbedSource } from "@/components/EmbedPlayer";
import { AppleMusicIcon, SpotifyIcon } from "@/components/icons";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { embedUrlForService } from "@/lib/embed";
import { buildShareUrl } from "@/lib/share-url";
import type {
  CachedPlaylist,
  LinkQuality,
  PlaylistEvent,
  PlaylistMetadata,
  ResolveResult,
  ResolvedPlaylistTrack,
  Service,
} from "@/lib/types";

const PLAYLIST_USE_STREAM = "PLAYLIST_USE_STREAM";

function QualityBadge({ quality }: { quality: LinkQuality }) {
  const styles: Record<LinkQuality, string> = {
    exact: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    search: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    fallback: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[quality]}`}
    >
      {quality}
    </span>
  );
}

function Artwork({
  src,
  alt,
  size = "md",
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!src) return null;

  const sizes = {
    sm: "h-14 w-14 rounded-lg",
    md: "h-20 w-20 sm:h-24 sm:w-24 rounded-xl",
    lg: "h-16 w-16 sm:h-20 sm:w-20 rounded-xl",
  };

  return (
    <div className={`artwork-frame ${sizes[size]}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#1db954]/20 text-[#1ed760]">
        <SpotifyIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="flex flex-col items-center gap-1 px-1">
        <div className="h-0.5 w-8 sm:w-10 rounded-full bg-gradient-to-r from-[#1ed760] to-[#ff375f]" />
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[#1ed760]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#ff375f]" />
        </div>
      </div>
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#fc3c44]/20 text-[#ff375f]">
        <AppleMusicIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}

function CacheNote({ cached }: { cached?: boolean }) {
  if (!cached) return null;
  return (
    <p className="text-xs text-zinc-500">Loaded from saved result</p>
  );
}

interface BridgeAppProps {
  initialUrl?: string;
}

export default function BridgeApp({ initialUrl }: BridgeAppProps) {
  const [inputUrl, setInputUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [playlistMeta, setPlaylistMeta] = useState<PlaylistMetadata | null>(
    null,
  );
  const [playlistTracks, setPlaylistTracks] = useState<ResolvedPlaylistTrack[]>(
    [],
  );
  const [progress, setProgress] = useState({ resolved: 0, total: 0 });
  const [copied, setCopied] = useState(false);
  const [playingTrack, setPlayingTrack] =
    useState<ResolvedPlaylistTrack | null>(null);
  const [playPreferred, setPlayPreferred] = useState<Service | undefined>();

  const shareUrl = result
    ? buildShareUrl(result.sourceUrl)
    : playlistMeta
      ? buildShareUrl(playlistMeta.sourceUrl)
      : "";

  const singleEmbedSources = useMemo((): EmbedSource[] => {
    if (!result) return [];
    const sources: EmbedSource[] = [];
    if (
      result.spotify &&
      result.spotify.quality !== "search" &&
      embedUrlForService(result.spotify.url, "spotify")
    ) {
      sources.push({
        service: "spotify",
        url: result.spotify.url,
        linkType: result.linkType,
      });
    }
    if (
      result.apple &&
      result.apple.quality !== "search" &&
      embedUrlForService(result.apple.url, "apple")
    ) {
      sources.push({
        service: "apple",
        url: result.apple.url,
        linkType: result.linkType,
      });
    }
    return sources;
  }, [result]);

  const playlistEmbedSources = useMemo((): EmbedSource[] => {
    if (!playlistMeta) return [];

    if (playingTrack) {
      const sources: EmbedSource[] = [];
      if (
        playingTrack.spotify &&
        playingTrack.spotify.quality !== "search" &&
        embedUrlForService(playingTrack.spotify.url, "spotify")
      ) {
        sources.push({
          service: "spotify",
          url: playingTrack.spotify.url,
          linkType: "track",
          label: "Spotify",
        });
      }
      if (
        playingTrack.apple &&
        playingTrack.apple.quality !== "search" &&
        embedUrlForService(playingTrack.apple.url, "apple")
      ) {
        sources.push({
          service: "apple",
          url: playingTrack.apple.url,
          linkType: "track",
          label: "Apple Music",
        });
      }
      if (sources.length > 0) return sources;
    }

    const sources: EmbedSource[] = [];
    if (playlistMeta.sourceService === "spotify") {
      sources.push({
        service: "spotify",
        url: playlistMeta.sourceUrl,
        linkType: "playlist",
      });
    } else {
      sources.push({
        service: "apple",
        url: playlistMeta.sourceUrl,
        linkType: "playlist",
      });
    }
    return sources;
  }, [playlistMeta, playingTrack]);

  const playTrack = (track: ResolvedPlaylistTrack, service: Service) => {
    setPlayingTrack(track);
    setPlayPreferred(service);
  };

  const applyCachedPlaylist = useCallback((cached: CachedPlaylist) => {
    setPlaylistMeta({ ...cached.metadata, cached: true });
    setPlaylistTracks(cached.tracks);
    setProgress({
      resolved: cached.tracks.length,
      total: cached.metadata.totalTracks,
    });
    setResult(null);
  }, []);

  const resolvePlaylist = useCallback(
    async (url: string) => {
      const cacheKey = `playlist:${url}`;
      const cached = readClientCache<CachedPlaylist>(cacheKey);
      if (cached) {
        applyCachedPlaylist(cached);
        return;
      }

      setPlaylistMeta(null);
      setPlaylistTracks([]);
      setProgress({ resolved: 0, total: 0 });
      setResult(null);

      const response = await fetch("/api/resolve/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to resolve playlist");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collected: CachedPlaylist = {
        metadata: {
          title: "",
          totalTracks: 0,
          sourceService: "spotify",
          sourceUrl: url,
        },
        tracks: [],
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PlaylistEvent;

          if (event.type === "start") {
            collected.metadata = event.data;
            setPlaylistMeta(event.data);
            setProgress({ resolved: 0, total: event.data.totalTracks });
          } else if (event.type === "track") {
            collected.tracks.push(event.data);
            setPlaylistTracks((prev) => [...prev, event.data]);
          } else if (event.type === "progress") {
            setProgress(event.data);
          } else if (event.type === "error") {
            throw new Error(event.data.message);
          } else if (event.type === "complete") {
            writeClientCache(cacheKey, collected);
          }
        }
      }
    },
    [applyCachedPlaylist],
  );

  const handleConvert = useCallback(
    async (url?: string) => {
      const target = (url ?? inputUrl).trim();
      if (!target) {
        setError("Please enter a URL");
        return;
      }

      setLoading(true);
      setError(null);
      setResult(null);
      setPlaylistMeta(null);
      setPlaylistTracks([]);
      setPlayingTrack(null);
      setPlayPreferred(undefined);

      try {
        const cacheKey = `resolve:${target}`;
        const cached = readClientCache<ResolveResult>(cacheKey);
        if (cached) {
          setResult({ ...cached, cached: true });
          return;
        }

        const response = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target }),
        });

        if (response.status === 422) {
          const data = await response.json();
          if (data.error === PLAYLIST_USE_STREAM) {
            await resolvePlaylist(target);
            return;
          }
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to resolve URL");
        }

        const data = (await response.json()) as ResolveResult;
        writeClientCache(cacheKey, data);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [inputUrl, resolvePlaylist],
  );

  useEffect(() => {
    if (initialUrl) {
      handleConvert(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "Playlist Bridge",
        url: shareUrl,
      });
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:py-10">
      <header className="mb-8 sm:mb-10 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-5 sm:mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Playlist Bridge
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Convert between Spotify and Apple Music — songs, albums, artists &
          playlists
        </p>
      </header>

      <div className="glass mb-6 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConvert()}
            placeholder="Paste a Spotify or Apple Music URL…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#1db954]/50 focus:outline-none focus:ring-1 focus:ring-[#1db954]/30"
          />
          <button
            onClick={() => handleConvert()}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-[#1db954] to-[#1ed760] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50 sm:shrink-0"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 spinner rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              "Convert"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass mb-6 rounded-2xl border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="glass mb-6 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
            <Artwork src={result.artwork} alt={result.title} size="md" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white break-words">
                    {result.title}
                  </h2>
                  {result.artist && (
                    <p className="text-sm text-zinc-400 break-words">
                      {result.artist}
                    </p>
                  )}
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {result.linkType}
                  </p>
                  <CacheNote cached={result.cached} />
                </div>
                <QualityBadge quality={result.linkQuality} />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {result.spotify && (
                  <a
                    href={result.spotify.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1db954]/20 px-4 py-2.5 text-sm font-medium text-[#1ed760] transition hover:bg-[#1db954]/30"
                  >
                    <SpotifyIcon className="h-4 w-4 shrink-0" />
                    Open on Spotify
                  </a>
                )}
                {result.apple && (
                  <a
                    href={result.apple.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fc3c44]/20 px-4 py-2.5 text-sm font-medium text-[#ff375f] transition hover:bg-[#fc3c44]/30"
                  >
                    <AppleMusicIcon className="h-4 w-4 shrink-0" />
                    Open on Apple Music
                  </a>
                )}
              </div>
            </div>
          </div>

          {singleEmbedSources.length > 0 && (
            <EmbedPlayer
              sources={singleEmbedSources}
              preferred={result.sourceService}
              className="mt-5 border-t border-white/10 pt-4"
            />
          )}

          {shareUrl && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs text-zinc-500">Share link</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 sm:flex-none"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 sm:flex-none"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {playlistMeta && (
        <div className="glass mb-6 rounded-2xl p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3 sm:gap-4">
            <Artwork
              src={playlistMeta.artwork}
              alt={playlistMeta.title}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white break-words">
                {playlistMeta.title}
              </h2>
              <p className="text-sm text-zinc-400">
                {progress.resolved} / {progress.total} tracks resolved
              </p>
              <CacheNote cached={playlistMeta.cached} />
            </div>
          </div>

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1db954] to-[#ff375f] transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.resolved / progress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>

          {playlistEmbedSources.length > 0 && (
            <div className="mb-4">
              <EmbedPlayer
                sources={playlistEmbedSources}
                preferred={playPreferred ?? playlistMeta.sourceService}
              />
              {playingTrack && (
                <button
                  type="button"
                  onClick={() => {
                    setPlayingTrack(null);
                    setPlayPreferred(undefined);
                  }}
                  className="mt-2 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                >
                  Back to full playlist player
                </button>
              )}
            </div>
          )}

          <div className="max-h-96 space-y-2 overflow-y-auto overscroll-contain">
            {playlistTracks.map((track, i) => {
              const isActive =
                playingTrack?.title === track.title &&
                playingTrack?.artist === track.artist;
              const canPlaySpotify =
                track.spotify &&
                track.spotify.quality !== "search" &&
                embedUrlForService(track.spotify.url, "spotify");
              const canPlayApple =
                track.apple &&
                track.apple.quality !== "search" &&
                embedUrlForService(track.apple.url, "apple");

              return (
                <div
                  key={`${track.title}-${i}`}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    isActive ? "bg-white/10 ring-1 ring-white/15" : "bg-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {track.artist}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {track.spotify && (
                      <button
                        type="button"
                        onClick={() =>
                          canPlaySpotify
                            ? playTrack(track, "spotify")
                            : window.open(track.spotify!.url, "_blank")
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1db954]/20 text-[#1ed760] hover:bg-[#1db954]/30"
                        title={
                          canPlaySpotify
                            ? "Play on Spotify"
                            : "Open on Spotify"
                        }
                      >
                        <SpotifyIcon className="h-4 w-4" />
                      </button>
                    )}
                    {track.apple && (
                      <button
                        type="button"
                        onClick={() =>
                          canPlayApple
                            ? playTrack(track, "apple")
                            : window.open(track.apple!.url, "_blank")
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fc3c44]/20 text-[#ff375f] hover:bg-[#fc3c44]/30"
                        title={
                          canPlayApple
                            ? "Play on Apple Music"
                            : "Open on Apple Music"
                        }
                      >
                        <AppleMusicIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {shareUrl && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                />
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 sm:shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-zinc-600">
        No API keys required · Powered by Odesli, iTunes Search & embed scraping
      </footer>
    </div>
  );
}
