import { fetchJson } from "./http";
import type { LinkQuality } from "./types";

interface OdesliLink {
  url: string;
  entityUniqueId?: string;
}

interface OdesliResponse {
  entityUniqueId?: string;
  entitiesByUniqueId?: Record<
    string,
    {
      title?: string;
      artistName?: string;
      thumbnailUrl?: string;
      type?: string;
    }
  >;
  linksByPlatform?: {
    spotify?: OdesliLink;
    appleMusic?: OdesliLink;
    itunes?: OdesliLink;
  };
}

export interface OdesliResult {
  title?: string;
  artist?: string;
  artwork?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  quality: LinkQuality;
}

export async function resolveWithOdesli(url: string): Promise<OdesliResult | null> {
  try {
    const data = await fetchJson<OdesliResponse>(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`,
    );

    const entityId = data.entityUniqueId;
    const entity = entityId ? data.entitiesByUniqueId?.[entityId] : undefined;
    const links = data.linksByPlatform;

    const spotifyUrl = links?.spotify?.url;
    const appleUrl = links?.appleMusic?.url ?? links?.itunes?.url;

    if (!spotifyUrl && !appleUrl) {
      return null;
    }

    return {
      title: entity?.title,
      artist: entity?.artistName,
      artwork: entity?.thumbnailUrl,
      spotifyUrl,
      appleUrl,
      quality: "exact",
    };
  } catch {
    return null;
  }
}
