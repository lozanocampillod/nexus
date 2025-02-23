import { CardContent } from "@/components/ui/card";
import { LangCode } from "@/lib/langcodes";
import { extractEtymologySection, fetchWiktionaryData } from "@/lib/wiktionary";

async function fetchEtymologySection(lang: LangCode, word: string) {
  const data = await fetchWiktionaryData(word, lang);
  return extractEtymologySection(data, lang);
}

export const EtymologySection = async ({
  lang,
  word,
}: {
  lang: LangCode;
  word: string;
}) => (
  <CardContent>
    <pre className="text-left text-xs whitespace-pre-wrap">
      {await fetchEtymologySection(lang, word)}
    </pre>
  </CardContent>
);
