"use client";

import { useEffect, useMemo, useState } from "react";
import { AppleMusicIcon, SpotifyIcon } from "@/components/icons";
import {
  embedIframeHeight,
  embedUrlForService,
} from "@/lib/embed";
import type { LinkType, Service } from "@/lib/types";

export interface EmbedSource {
  service: Service;
  url: string;
  linkType?: LinkType;
  label?: string;
}

interface EmbedPlayerProps {
  sources: EmbedSource[];
  /** Preferred service when multiple are available */
  preferred?: Service;
  className?: string;
}

export default function EmbedPlayer({
  sources,
  preferred,
  className,
}: EmbedPlayerProps) {
  const available = useMemo(() => {
    return sources
      .map((source) => {
        const embedUrl = embedUrlForService(source.url, source.service);
        if (!embedUrl) return null;
        return { ...source, embedUrl };
      })
      .filter((s): s is EmbedSource & { embedUrl: string } => Boolean(s));
  }, [sources]);

  const [active, setActive] = useState<Service | null>(null);

  useEffect(() => {
    if (available.length === 0) {
      setActive(null);
      return;
    }
    const preferredHit = preferred
      ? available.find((s) => s.service === preferred)
      : undefined;
    setActive((preferredHit ?? available[0]).service);
  }, [available, preferred]);

  const current = available.find((s) => s.service === active) ?? available[0];

  if (!current) return null;

  const height = embedIframeHeight(current.service, current.linkType);

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Play in browser
        </p>
        {available.length > 1 && (
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {available.map((source) => {
              const selected = source.service === current.service;
              return (
                <button
                  key={source.service}
                  type="button"
                  onClick={() => setActive(source.service)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    selected
                      ? source.service === "spotify"
                        ? "bg-[#1db954]/25 text-[#1ed760]"
                        : "bg-[#fc3c44]/25 text-[#ff375f]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {source.service === "spotify" ? (
                    <SpotifyIcon className="h-3.5 w-3.5" />
                  ) : (
                    <AppleMusicIcon className="h-3.5 w-3.5" />
                  )}
                  {source.label ??
                    (source.service === "spotify" ? "Spotify" : "Apple Music")}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <iframe
          key={current.embedUrl}
          title={`${current.service === "spotify" ? "Spotify" : "Apple Music"} player`}
          src={current.embedUrl}
          width="100%"
          height={height}
          allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          loading="lazy"
          className="block w-full border-0"
          style={{ maxWidth: "100%", minHeight: height }}
        />
      </div>

      <p className="mt-2 text-xs text-zinc-600">
        Sign in to{" "}
        {current.service === "spotify" ? "Spotify" : "Apple Music"} in this
        browser for full playback. Guests may hear previews only.
      </p>
    </div>
  );
}
