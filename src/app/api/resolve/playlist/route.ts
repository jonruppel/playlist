import { resolvePlaylistStream } from "@/lib/resolve-playlist";
import { UrlParseError } from "@/lib/resolve";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return new Response(JSON.stringify({ type: "error", data: { message: "Missing url" } }), {
        status: 400,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of resolvePlaylistStream(url)) {
            controller.enqueue(
              encoder.encode(`${JSON.stringify(event)}\n`),
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Stream failed";
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({ type: "error", data: { message } })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (error instanceof UrlParseError) {
      return new Response(
        JSON.stringify({ type: "error", data: { message: error.message } }),
        {
          status: 400,
          headers: { "Content-Type": "application/x-ndjson" },
        },
      );
    }

    return new Response(
      JSON.stringify({ type: "error", data: { message: "Invalid request" } }),
      {
        status: 400,
        headers: { "Content-Type": "application/x-ndjson" },
      },
    );
  }
}
