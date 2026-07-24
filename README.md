# Playlist Bridge

Convert Spotify and Apple Music links to each other — songs, albums, artists, and playlists. No API keys, no OAuth, no accounts.

## Features

- Paste a Spotify or Apple Music URL and get links on both platforms
- Supports tracks, albums, artists, and playlists
- Playlist resolution streams results progressively (up to 100 tracks)
- Shareable canonical URLs via `/link?url=...`
- Unified playlist player driven by the bridged track list (~30s previews; full songs via Spotify/Apple)
- In-browser embeds for single tracks/albums
- Dark glassmorphism UI with Spotify × Apple Music aesthetics
- Quality badges: `exact`, `search`, or `fallback`

## Tech Stack

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Standalone output for production

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BASE_URL` | Optional. Base URL for share links (defaults to request origin or `http://localhost:3000`) |

## API

### `POST /api/resolve`

Resolve a single track, album, or artist URL.

**Request:**
```json
{ "url": "https://open.spotify.com/track/..." }
```

**Response:**
```json
{
  "sourceUrl": "...",
  "sourceService": "spotify",
  "linkType": "track",
  "title": "Song Title",
  "artist": "Artist Name",
  "artwork": "https://...",
  "spotify": { "url": "...", "quality": "exact" },
  "apple": { "url": "...", "quality": "exact" },
  "linkQuality": "exact"
}
```

Returns `422` with `{ "error": "PLAYLIST_USE_STREAM" }` for playlist URLs — use the streaming endpoint instead.

### `POST /api/resolve/playlist`

Streams NDJSON events for playlist resolution:

- `start` — playlist metadata
- `track` — resolved track with platform links
- `progress` — `{ resolved, total }`
- `complete` — done
- `error` — failure message

## Caching

Resolved links are cached for 30 days so repeat visits to the same Bridge link skip external lookups:

- **Server cache** — Next.js Data Cache for singles and full playlists
- **Browser cache** — `sessionStorage` for instant reloads in the same tab

Cached results show a subtle “Loaded from saved result” note.

No official Spotify or Apple Music APIs. Uses free/public sources:

- **Odesli (song.link)** — primary cross-platform matching
- **iTunes Search API** — Apple Music lookups and fallback matching
- **Spotify oEmbed** — metadata for Spotify URLs
- **Spotify embed scraping** — playlist track lists
- **Apple Music schema.org** — playlist track lists from page JSON-LD

## Production

```bash
npm run build
npm run start
```

The `postbuild` script copies static assets into the standalone output.

### Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). `vercel.json` is included. Set `NEXT_PUBLIC_BASE_URL` to your production domain for share links.

## License

MIT
