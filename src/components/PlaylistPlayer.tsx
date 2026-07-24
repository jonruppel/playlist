"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppleMusicIcon, SpotifyIcon } from "@/components/icons";
import type { PlaylistMetadata, ResolvedPlaylistTrack } from "@/lib/types";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlaylistPlayerProps {
  meta: PlaylistMetadata;
  tracks: ResolvedPlaylistTrack[];
  resolving?: boolean;
  progress?: { resolved: number; total: number };
  onShare?: () => void;
  onCopy?: () => void;
  copied?: boolean;
  shareUrl?: string;
}

export default function PlaylistPlayer({
  meta,
  tracks,
  resolving,
  progress,
  onShare,
  onCopy,
  copied,
  shareUrl,
}: PlaylistPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playableIndexes = useMemo(
    () =>
      tracks
        .map((track, i) => (track.previewUrl ? i : -1))
        .filter((i) => i >= 0),
    [tracks],
  );

  const current = tracks[index];
  const hasPreview = Boolean(current?.previewUrl);
  const previewCount = playableIndexes.length;

  // Keep index valid as tracks stream in
  useEffect(() => {
    if (tracks.length === 0) return;
    if (index >= tracks.length) setIndex(0);
  }, [tracks.length, index]);

  // Load / play when index or preview changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.previewUrl) {
      setPlaying(false);
      return;
    }

    audio.src = current.previewUrl;
    audio.load();
    setCurrentTime(0);

    if (playing) {
      void audio.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.previewUrl]);

  // Scroll active track into view
  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-track-index="${index}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index]);

  const playAt = (nextIndex: number, autoplay = true) => {
    setIndex(nextIndex);
    if (autoplay) setPlaying(true);
  };

  const nextPlayable = (from: number, direction: 1 | -1): number | null => {
    if (playableIndexes.length === 0) return null;
    if (direction === 1) {
      const next = playableIndexes.find((i) => i > from);
      return next ?? playableIndexes[0];
    }
    const prev = [...playableIndexes].reverse().find((i) => i < from);
    return prev ?? playableIndexes[playableIndexes.length - 1];
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!current?.previewUrl) {
      const first = playableIndexes[0];
      if (first != null) playAt(first);
      return;
    }
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const goNext = () => {
    const next = nextPlayable(index, 1);
    if (next != null) playAt(next);
  };

  const goPrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 2) {
      audio.currentTime = 0;
      return;
    }
    const prev = nextPlayable(index, -1);
    if (prev != null) playAt(prev);
  };

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={goNext}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Now playing header */}
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="artwork-frame h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24">
            {(current?.artwork || meta.artwork) && (
              <img
                src={current?.artwork || meta.artwork}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {meta.title}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-white">
              {current?.title ?? "Loading tracks…"}
            </h2>
            <p className="truncate text-sm text-zinc-400">
              {current?.artist ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {resolving
                ? `Resolving ${progress?.resolved ?? 0}/${progress?.total ?? "…"}`
                : `${tracks.length} tracks`}
              {previewCount > 0
                ? ` · ${previewCount} playable previews`
                : tracks.length > 0
                  ? " · previews loading…"
                  : ""}
            </p>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="w-8 text-right text-[11px] tabular-nums text-zinc-500">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              disabled={!hasPreview}
              onChange={(e) => {
                const t = Number(e.target.value);
                setCurrentTime(t);
                if (audioRef.current) audioRef.current.currentTime = t;
              }}
              className="h-1 flex-1 cursor-pointer accent-[#1ed760] disabled:opacity-40"
            />
            <span className="w-8 text-[11px] tabular-nums text-zinc-500">
              {formatTime(duration)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={previewCount === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={previewCount === 0 && !resolving}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#1db954] to-[#1ed760] text-black shadow-lg transition hover:brightness-110 disabled:opacity-40"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={previewCount === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30"
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z" />
              </svg>
            </button>
          </div>

          {!hasPreview && current && (
            <p className="mt-2 text-center text-xs text-amber-400/90">
              No preview for this track — open Spotify or Apple Music below, or
              skip ahead.
            </p>
          )}
          {hasPreview && (
            <p className="mt-2 text-center text-xs text-zinc-600">
              Playing ~30s previews through your bridged track list
            </p>
          )}
        </div>

        {/* Current track platform actions */}
        {current && (
          <div className="mt-3 flex flex-wrap gap-2">
            {current.spotify && (
              <a
                href={current.spotify.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1db954]/20 px-3 py-2 text-xs font-medium text-[#1ed760] hover:bg-[#1db954]/30 sm:flex-none"
              >
                <SpotifyIcon className="h-3.5 w-3.5" />
                Full song on Spotify
              </a>
            )}
            {current.apple && (
              <a
                href={current.apple.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#fc3c44]/20 px-3 py-2 text-xs font-medium text-[#ff375f] hover:bg-[#fc3c44]/30 sm:flex-none"
              >
                <AppleMusicIcon className="h-3.5 w-3.5" />
                Full song on Apple
              </a>
            )}
          </div>
        )}
      </div>

      {/* Track list = playlist */}
      <div
        ref={listRef}
        className="max-h-[min(28rem,50vh)] overflow-y-auto overscroll-contain"
      >
        {tracks.map((track, i) => {
          const active = i === index;
          const canPreview = Boolean(track.previewUrl);

          return (
            <button
              key={`${track.title}-${i}`}
              type="button"
              data-track-index={i}
              onClick={() => playAt(i, canPreview)}
              className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 ${
                active
                  ? "bg-white/10"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`w-6 shrink-0 text-center text-xs tabular-nums ${
                  active ? "text-[#1ed760]" : "text-zinc-600"
                }`}
              >
                {active && playing ? (
                  <span className="inline-block h-3 w-3 animate-pulse rounded-sm bg-[#1ed760]" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    active ? "text-white" : "text-zinc-200"
                  }`}
                >
                  {track.title}
                </p>
                <p className="truncate text-xs text-zinc-500">{track.artist}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!canPreview && (
                  <span className="text-[10px] text-zinc-600">no preview</span>
                )}
                {track.spotify && (
                  <a
                    href={track.spotify.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1db954]/15 text-[#1ed760] hover:bg-[#1db954]/30"
                    title="Open on Spotify"
                  >
                    <SpotifyIcon className="h-3.5 w-3.5" />
                  </a>
                )}
                {track.apple && (
                  <a
                    href={track.apple.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fc3c44]/15 text-[#ff375f] hover:bg-[#fc3c44]/30"
                    title="Open on Apple Music"
                  >
                    <AppleMusicIcon className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </button>
          );
        })}
        {tracks.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Loading tracks…
          </p>
        )}
      </div>

      {/* Share */}
      {shareUrl && (
        <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onShare}
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            Share playlist
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 sm:min-w-[7rem]"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
