import { NextResponse } from "next/server";
import {
  PLAYLIST_USE_STREAM,
  resolveUrl,
  UrlParseError,
} from "@/lib/resolve";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const result = await resolveUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UrlParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.name === PLAYLIST_USE_STREAM) {
      return NextResponse.json(
        { error: PLAYLIST_USE_STREAM },
        { status: 422 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to resolve URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
