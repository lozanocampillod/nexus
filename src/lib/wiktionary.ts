import { LangCode, LANGCODES } from "@/lib/langcodes";

export interface WiktionaryData {
  parse: {
    wikitext: {
      "*": string;
    };
  };
}

export async function fetchWiktionaryData(
  word: string,
  lang: LangCode
): Promise<WiktionaryData> {
  const section = word.startsWith("*")
    ? `Reconstruction:${LANGCODES[lang].replace(/ /g, "_")}/`
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

export function extractEtymologySection(data: WiktionaryData, lang: LangCode) {
  // Validate input
  if (!data?.parse?.wikitext) {
    throw new Error("Invalid JSON structure.");
  }

  const wikitext = data.parse.wikitext["*"];
  const lines = wikitext.split("\n");

  // Step 1: Extract the language section
  const languageName = LANGCODES[lang];
  const languagePattern = new RegExp(`^==${languageName}==`);
  const nextLanguagePattern = /^==[^=]/;

  let inLanguageSection = false;
  const languageLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (languagePattern.test(trimmedLine)) {
      inLanguageSection = true;
      continue;
    }

    if (inLanguageSection && nextLanguagePattern.test(trimmedLine)) {
      break;
    }

    if (inLanguageSection) {
      languageLines.push(trimmedLine);
    }
  }

  if (languageLines.length === 0) {
    throw new Error(`Language section for "${lang}" not found.`);
  }

  // Step 2: Extract etymology subsection from language section
  const etymologyPattern = /^===Etymology/;
  const nextSectionPattern = /^===/;

  let inEtymologySection = false;
  const etymologyLines: string[] = [];

  for (const line of languageLines) {
    if (etymologyPattern.test(line)) {
      inEtymologySection = true;
      continue;
    }

    if (inEtymologySection && nextSectionPattern.test(line)) {
      break;
    }

    if (inEtymologySection) {
      etymologyLines.push(line);
    }
  }

  if (etymologyLines.length === 0) {
    throw new Error(`Etymology section not found under "${lang}".`);
  }

  // Return non-empty etymology lines
  return etymologyLines
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

export function extractTemplates(text: string): string[] {
  const templates: string[] = [];
  const templateRegex = /{{([^}]+)}}/g;
  let match: RegExpExecArray | null;
  while ((match = templateRegex.exec(text)) !== null) {
    templates.push(match[1]);
  }
  return templates;
}
