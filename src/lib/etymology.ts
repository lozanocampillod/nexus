import { parseTemplates } from "@/lib/parsers";
import { LangCode, LANGCODES } from "@/lib/langcodes";

interface WiktionaryData {
  parse: {
    wikitext: {
      "*": string;
    };
  };
}

interface EtymologyNode {
  type: string;
  lang: LangCode;
  word: string;
  relations?: EtymologyNode[];
}

async function fetchWiktionaryData(
  word: string,
  lang: LangCode
): Promise<WiktionaryData> {
  const section = word.startsWith("*")
    ? `Reconstruction:${LANGCODES[lang]}/`
    : "";
  const cleanedWord = word.startsWith("*") ? word.slice(1) : word;
  const queryParams = {
    action: "parse",
    page: `${section}${encodeURIComponent(cleanedWord)}`,
    prop: "wikitext",
    format: "json",
    utf8: "1",
    origin: "*",
  };
  const url = `https://en.wiktionary.org/w/api.php?${Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&")}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Error fetching data for '${word}': ${response.statusText}`);
    throw new Error(
      `Error fetching data for '${word}': ${response.statusText}`
    );
  }

  return await response.json();
}

function extractEtymologySection(data: WiktionaryData, lang: LangCode): string {
  if (!data?.parse?.wikitext) {
    throw new Error("Invalid JSON structure.");
  }
  const wikitext = data.parse.wikitext["*"];

  // First look for language-specific etymology
  const languageMatch = wikitext.match(
    new RegExp(
      `==${LANGCODES[lang]}==\\s*((?:(?!==)[\\s\\S])*?)===Etymology(?:\\s*\\d+)?===\\s*([\\s\\S]*?)(?=\\n==|\\n===|$)`,
      "g"
    )
  );

  // If not found, try to find any etymology section
  if (languageMatch) {
    return languageMatch[0].trim();
  } else {
    const anyMatch = wikitext.match(
      /===Etymology(?:\s*\d+)?===\s*([\s\S]*?)(?=\n==|\n===|$)/
    );
    if (!anyMatch) {
      throw new Error("Etymology section not found.");
    }
    return anyMatch[0].trim();
  }
}

function extractTemplates(text: string): string[] {
  const templates: string[] = [];
  const templateRegex = /{{([^}]+)}}/g;
  let match: RegExpExecArray | null;
  while ((match = templateRegex.exec(text)) !== null) {
    templates.push(match[1]);
  }
  return templates;
}

export async function buildEtymologyGraph(
  word: string,
  type: string = "base",
  lang: LangCode = "en"
): Promise<EtymologyNode> {
  if (type === "cog" || type === "unk") {
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
  const rootTemplate = parsedTemplates.find(
    (template) => template.type !== "cog"
  );
  const rootNode = rootTemplate
    ? await buildEtymologyGraph(
        rootTemplate.word,
        rootTemplate.type,
        rootTemplate.srcLang
      ).catch((error) => {
        console.error(
          `Failed to build etymology graph for ${rootTemplate.word}: ${error}`
        );
        return {
          type: rootTemplate.type,
          lang: rootTemplate.srcLang ?? "und",
          word: rootTemplate.word,
        };
      })
    : (() => {
        throw new Error("Root template is undefined.");
      })();

  const cognateNodes = parsedTemplates
    .filter((template) => template.type === "cog")
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
      rootNode,
      ...(cognateNodes.length > 0 ? [...cognateNodes] : []),
    ],
  };
}

export async function visualizeEtymologyGraph(word: string) {
  try {
    // Build the etymology graph recursively.
    const graph = await buildEtymologyGraph(word);

    // A helper function to recursively render the graph as a tree-like string.
    const renderTree = (node: EtymologyNode, indent = 0) => {
      const spacer = "  ".repeat(indent);
      // Format the current node.
      let treeStr = `${spacer}- ${node.word} [${node.lang}, ${node.type}]\n`;
      // If the node has child relations, render each of them.
      if (node.relations && node.relations.length > 0) {
        for (const child of node.relations) {
          treeStr += renderTree(child, indent + 1);
        }
      }
      return treeStr;
    };

    const visualization = renderTree(graph);
    return visualization;
  } catch (err) {
    console.error("Error generating etymology graph visualization:", err);
    throw err;
  }
}
