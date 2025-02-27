import { dedupGraph } from "@/lib/dedup-graph";
import { buildEtymologyGraph } from "@/lib/etymology";
import { LangCode } from "@/lib/langcodes";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ word: string; lang: LangCode }> }
) {
  const { word, lang } = await params;
  const graph = await buildEtymologyGraph(word, "base", lang);
  return new Response(JSON.stringify(dedupGraph(graph)), {
    headers: { "content-type": "text/json; charset=utf-8" },
  });
}
