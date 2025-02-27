import { EXCLUDED_ROOT_TEMPLATES, parseTemplates } from "@/lib/parsers";
import { LangCode } from "@/lib/langcodes";
import {
  extractEtymologySection,
  extractTemplates,
  fetchWiktionaryData,
} from "@/lib/wiktionary";
import { first } from "effect/GroupBy";

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
  depth: number = 5
): Promise<EtymologyNode> {
  if (depth === 0 || type === "unk") {
    return { type, lang, word };
  }

  const wikitext = await fetchWiktionaryData(word, lang);
  const etymologySection = extractEtymologySection(wikitext, lang);
  const templates = extractTemplates(etymologySection);
  const parsedTemplates = parseTemplates(templates);

  const rootTemplates = parsedTemplates.filter(
    (template) => !EXCLUDED_ROOT_TEMPLATES.includes(template.type)
  );

  async function resolveGraph(
    word: string,
    type: string,
    srcLang: LangCode,
    currentDepth: number
  ): Promise<EtymologyNode> {
    try {
      return await buildEtymologyGraph(word, type, srcLang, currentDepth - 1);
    } catch {
      try {
        return await buildEtymologyGraph(
          removeDiacritics(word),
          type,
          srcLang,
          currentDepth - 1
        );
      } catch {
        return { type, lang: srcLang ?? "und", word };
      }
    }
  }

  const candidateRoot = rootTemplates.find((template) => !!template.word);
  const cognateTemplates = parsedTemplates.filter(
    (template) => template.type === "cognate"
  );
  const templatesToResolve = [candidateRoot, ...cognateTemplates].filter(
    (template) => !!template
  );

  const relations = await Promise.all(
    templatesToResolve.map(({ word, type, srcLang }) =>
      resolveGraph(word, type, srcLang ?? "und", depth)
    )
  );

  return { type, lang, word, relations };
}

function removeDiacritics(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
