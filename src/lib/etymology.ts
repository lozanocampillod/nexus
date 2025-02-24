import { EXCLUDED_ROOT_TEMPLATES, parseTemplates } from "@/lib/parsers";
import { LangCode } from "@/lib/langcodes";
import {
  extractEtymologySection,
  extractTemplates,
  fetchWiktionaryData,
} from "@/lib/wiktionary";

export interface EtymologyNode {
  type: string;
  lang: LangCode;
  word: string;
  relations?: EtymologyNode[];
  depth?: number;
}

export async function buildEtymologyGraph(
  word: string,
  type: string = "base",
  lang: LangCode = "en",
  depth: number = 10
): Promise<EtymologyNode> {
  if (depth === 0 || type === "cognate" || type === "unk") {
    return {
      type: type,
      lang: lang,
      word: word,
    };
  }

  const wikitext = await fetchWiktionaryData(word, lang);
  const etymologySection = extractEtymologySection(wikitext, lang);
  const templates = extractTemplates(etymologySection);
  const parsedTemplates = parseTemplates(templates);
  const rootTemplates = parsedTemplates.filter(
    (template) => !EXCLUDED_ROOT_TEMPLATES.includes(template.type)
  );

  const rootNodes =
    rootTemplates.length > 0
      ? await Promise.resolve(
          buildEtymologyGraph(
            rootTemplates[0].word,
            rootTemplates[0].type,
            rootTemplates[0].srcLang,
            depth - 1
          )
        ).catch(() => {
          return Promise.resolve(
            buildEtymologyGraph(
              removeDiacritics(rootTemplates[0].word),
              rootTemplates[0].type,
              rootTemplates[0].srcLang,
              depth - 1
            )
          ).catch(() => null);
        })
      : null;

  const cognateNodes = parsedTemplates
    .filter((template) => template.type === "cognate")
    .map((template) => ({
      type: template.type,
      lang: template.srcLang ?? "und",
      word: template.word,
    }));

  return {
    type: type,
    lang: lang,
    word: word,
    relations: [
      ...(rootNodes ? [rootNodes] : []),
      ...(cognateNodes.length > 0 ? [...cognateNodes] : []),
    ],
  };
}

function removeDiacritics(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
