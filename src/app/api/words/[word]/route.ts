import { buildEtymologyGraph } from "@/lib/etymology";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  return new Response(
    JSON.stringify(await buildEtymologyGraph((await params).word)),
    {
      headers: { "content-type": "text/json; charset=utf-8" },
    }
  );
}
