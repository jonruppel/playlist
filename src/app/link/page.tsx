import type { Metadata } from "next";
import BridgeApp from "@/components/BridgeApp";
import {
  buildShareMetadata,
  getSharePreview,
} from "@/lib/link-metadata";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const sourceUrl = params.url?.trim();

  if (!sourceUrl) {
    return {
      title: "Playlist Bridge",
      description:
        "Convert between Spotify and Apple Music — songs, albums, artists & playlists",
    };
  }

  try {
    const preview = await getSharePreview(sourceUrl);
    if (preview) {
      return buildShareMetadata(preview, sourceUrl);
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
