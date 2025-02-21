import { buildEtymologyGraph } from "@/lib/etymology";
import { LangCode } from "@/lib/langcodes";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ word: string; lang: string }> }
) {
  const { word, lang } = await params;
  return new Response(
    JSON.stringify(await buildEtymologyGraph(word, "base", lang as LangCode)),
    {
      headers: { "content-type": "text/json; charset=utf-8" },
    }
  );
}
