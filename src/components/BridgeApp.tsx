"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LinkQuality,
  PlaylistEvent,
  PlaylistMetadata,
  ResolveResult,
  ResolvedPlaylistTrack,
} from "@/lib/types";
import { buildShareUrl } from "@/lib/share-url";

const PLAYLIST_USE_STREAM = "PLAYLIST_USE_STREAM";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.065c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.207 10.207 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.77.98-.59 1.7-1.41 2.117-2.494a5.5 5.5 0 00.285-1.1c.1-.51.157-1.026.185-1.543.01-.19.028-.38.028-.57V6.124zm-3.335 12.832c-.02.176-.043.353-.07.53-.065.42-.18.828-.34 1.22-.49 1.22-1.31 2.03-2.55 2.51-.42.17-.86.27-1.31.33-.57.08-1.15.12-1.74.12H7.05c-.55 0-1.1-.04-1.65-.12a4.7 4.7 0 01-1.35-.35c-1.15-.45-2.01-1.25-2.57-2.36-.23-.45-.37-.93-.46-1.42-.08-.45-.12-.9-.12-1.36V8.735c.01-.57.05-1.14.15-1.7.07-.42.18-.83.33-1.23.48-1.24 1.28-2.1 2.48-2.64.42-.19.86-.31 1.31-.38.48-.08.97-.12 1.46-.12h9.28c.52 0 1.04.04 1.55.12.48.08.95.22 1.39.44 1.11.56 1.87 1.42 2.3 2.58.14.4.23.81.28 1.23.06.47.09.94.1 1.42v9.53c-.01.19-.03.38-.05.57zM8.02 6.66c.19-.01.38-.02.57-.02h6.82c.19 0 .38.01.57.02v.01c.38.02.75.08 1.11.18.73.2 1.28.62 1.62 1.3.17.35.25.73.28 1.12v8.18c0 .39-.08.77-.25 1.12-.34.68-.89 1.1-1.62 1.3-.36.1-.73.16-1.11.18-.19.01-.38.02-.57.02H8.59c-.19 0-.38-.01-.57-.02-.38-.02-.75-.08-1.11-.18-.73-.2-1.28-.62-1.62-1.3a2.5 2.5 0 01-.28-1.12V9.45c0-.39.08-.77.25-1.12.34-.68.89-1.1 1.62-1.3.36-.1.73-.16 1.11-.18v-.01z" />
      <path d="M15.62 11.38l-3.3 1.01v4.47l3.3-1.01v-4.47zM12.32 9.5L9.02 10.5v4.47l3.3-1.01V9.5z" />
    </svg>
  );
}

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

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1db954]/20 text-[#1ed760]">
        <SpotifyIcon className="h-6 w-6" />
      </div>
      <div className="flex flex-col items-center gap-1 px-1">
        <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-[#1ed760] to-[#ff375f]" />
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[#1ed760]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#ff375f]" />
        </div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fc3c44]/20 text-[#ff375f]">
        <AppleMusicIcon className="h-6 w-6" />
      </div>
    </div>
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

  const shareUrl = result
    ? buildShareUrl(result.sourceUrl)
    : playlistMeta
      ? buildShareUrl(playlistMeta.sourceUrl)
      : "";

  const resolvePlaylist = useCallback(async (url: string) => {
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
          setPlaylistMeta(event.data);
          setProgress({ resolved: 0, total: event.data.totalTracks });
        } else if (event.type === "track") {
          setPlaylistTracks((prev) => [...prev, event.data]);
        } else if (event.type === "progress") {
          setProgress(event.data);
        } else if (event.type === "error") {
          throw new Error(event.data.message);
        }
      }
    }
  }, []);

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

      try {
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10">
      <header className="mb-10 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">
          Playlist Bridge
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Convert between Spotify and Apple Music — songs, albums, artists &
          playlists
        </p>
      </header>

      <div className="glass mb-6 rounded-2xl p-4">
        <div className="flex gap-2">
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
            className="rounded-xl bg-gradient-to-r from-[#1db954] to-[#1ed760] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
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
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex gap-4">
            {result.artwork && (
              <img
                src={result.artwork}
                alt=""
                className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-lg"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {result.title}
                  </h2>
                  {result.artist && (
                    <p className="text-sm text-zinc-400">{result.artist}</p>
                  )}
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {result.linkType}
                  </p>
                </div>
                <QualityBadge quality={result.linkQuality} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {result.spotify && (
                  <a
                    href={result.spotify.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1db954]/20 px-4 py-2 text-sm font-medium text-[#1ed760] transition hover:bg-[#1db954]/30"
                  >
                    <SpotifyIcon className="h-4 w-4" />
                    Open on Spotify
                  </a>
                )}
                {result.apple && (
                  <a
                    href={result.apple.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#fc3c44]/20 px-4 py-2 text-sm font-medium text-[#ff375f] transition hover:bg-[#fc3c44]/30"
                  >
                    <AppleMusicIcon className="h-4 w-4" />
                    Open on Apple Music
                  </a>
                )}
              </div>
            </div>
          </div>

          {shareUrl && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs text-zinc-500">Share link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                />
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleShare}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {playlistMeta && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-4">
            {playlistMeta.artwork && (
              <img
                src={playlistMeta.artwork}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {playlistMeta.title}
              </h2>
              <p className="text-sm text-zinc-400">
                {progress.resolved} / {progress.total} tracks resolved
              </p>
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

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {playlistTracks.map((track, i) => (
              <div
                key={`${track.title}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5"
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
                    <a
                      href={track.spotify.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1db954]/20 text-[#1ed760] hover:bg-[#1db954]/30"
                      title="Open on Spotify"
                    >
                      <SpotifyIcon className="h-4 w-4" />
                    </a>
                  )}
                  {track.apple && (
                    <a
                      href={track.apple.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fc3c44]/20 text-[#ff375f] hover:bg-[#fc3c44]/30"
                      title="Open on Apple Music"
                    >
                      <AppleMusicIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {shareUrl && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                />
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
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
