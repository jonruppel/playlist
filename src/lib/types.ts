export type Service = "spotify" | "apple";
export type LinkType = "track" | "album" | "artist" | "playlist";
export type LinkQuality = "exact" | "search" | "fallback";

export interface PlatformLink {
  url: string;
  quality: LinkQuality;
}

export interface ResolveResult {
  sourceUrl: string;
  sourceService: Service;
  linkType: LinkType;
  title: string;
  artist?: string;
  artwork?: string;
  spotify?: PlatformLink;
  apple?: PlatformLink;
  linkQuality: LinkQuality;
  cached?: boolean;
}

export interface ParsedUrl {
  service: Service;
  linkType: LinkType;
  url: string;
  id: string;
  trackId?: string;
}

export interface PlaylistTrack {
  title: string;
  artist: string;
  sourceUrl?: string;
  /** ~30s preview MP3 when available (Spotify embed / iTunes) */
  previewUrl?: string;
}

export interface PlaylistMetadata {
  title: string;
  artwork?: string;
  totalTracks: number;
  sourceService: Service;
  sourceUrl: string;
  cached?: boolean;
}

export interface CachedPlaylist {
  metadata: PlaylistMetadata;
  tracks: ResolvedPlaylistTrack[];
}

export interface ResolvedPlaylistTrack extends PlaylistTrack {
  spotify?: PlatformLink;
  apple?: PlatformLink;
  linkQuality: LinkQuality;
  artwork?: string;
}

export type PlaylistEvent =
  | { type: "start"; data: PlaylistMetadata }
  | { type: "track"; data: ResolvedPlaylistTrack }
  | { type: "progress"; data: { resolved: number; total: number } }
  | { type: "complete" }
  | { type: "error"; data: { message: string } };

export const PLAYLIST_USE_STREAM = "PLAYLIST_USE_STREAM";
export const MAX_PLAYLIST_TRACKS = 100;
