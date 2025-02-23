import { LangCode, searchLang } from "@/lib/langcodes";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lang: LangCode }> }
) {
  const { lang } = await params;
  return new Response(JSON.stringify(searchLang(lang)), {
    headers: { "content-type": "text/json" },
  });
}
