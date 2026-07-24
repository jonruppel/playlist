import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;
  if (params.url) {
    redirect(`/link?url=${encodeURIComponent(params.url)}`);
  }

  const BridgeApp = (await import("@/components/BridgeApp")).default;
  return <BridgeApp />;
}
