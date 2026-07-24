import type { Metadata } from "next";
import BridgeApp from "@/components/BridgeApp";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const sourceUrl = params.url;

  if (!sourceUrl) {
    return {
      title: "Playlist Bridge",
      description:
        "Convert between Spotify and Apple Music — songs, albums, artists & playlists",
    };
  }

  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    const response = await fetch(`${base}/api/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl }),
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        title: `${data.title}${data.artist ? ` — ${data.artist}` : ""} | Playlist Bridge`,
        description: `Listen on Spotify and Apple Music: ${data.title}`,
        openGraph: {
          title: data.title,
          description: data.artist
            ? `${data.artist} on Spotify & Apple Music`
            : "Cross-platform music link",
          images: data.artwork ? [{ url: data.artwork }] : undefined,
        },
      };
    }
  } catch {
    // fall through to default metadata
  }

  return {
    title: "Playlist Bridge",
    description: "Convert between Spotify and Apple Music",
  };
}

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;
  return <BridgeApp initialUrl={params.url} />;
}
