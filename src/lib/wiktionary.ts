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
  const isReconstruction = word.startsWith("*");
  const pagePrefix = isReconstruction
    ? `Reconstruction:${LANGCODES[lang].replace(/ /g, "_")}/`
    : "";
  const cleanWord = isReconstruction ? word.slice(1) : word;

  const queryParams = {
    action: "parse",
    page: `${pagePrefix}${encodeURIComponent(cleanWord)}`,
    prop: "wikitext",
    format: "json",
    utf8: "1",
    origin: "*",
  };

  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const url = `https://en.wiktionary.org/w/api.php?${queryString}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorMessage = `Error fetching data for '${word}': ${response.statusText}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

function extractSection(
  lines: string[],
  headerRegex: RegExp,
  endRegex: RegExp,
  errorMessage: string
): string[] {
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (headerRegex.test(trimmedLine)) {
      inSection = true;
      continue;
    }

    if (inSection && endRegex.test(trimmedLine)) {
      break;
    }

    if (inSection) {
      sectionLines.push(trimmedLine);
    }
  }

  if (sectionLines.length === 0) {
    throw new Error(errorMessage);
  }

  return sectionLines;
}

export function extractLanguageSection(
  wikitext: string,
  language: string
): string[] {
  const lines = wikitext.split("\n");
  const languageHeaderRegex = new RegExp(`^==\\s*${language}\\s*==`);
  const nextLanguageRegex = /^==\s*[^=].*$/;

  return extractSection(
    lines,
    languageHeaderRegex,
    nextLanguageRegex,
    `Language section for "${language}" not found.`
  );
}

export function extractSubsection(
  sectionLines: string[],
  subsectionTitle: string
): string {
  const subsectionHeaderRegex = new RegExp(`^===\\s*${subsectionTitle}`);
  const nextSubsectionRegex = /^===/;

  const subsectionContent = extractSection(
    sectionLines,
    subsectionHeaderRegex,
    nextSubsectionRegex,
    `${subsectionTitle} section not found.`
  );

  return subsectionContent
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

export function extractEtymologySection(
  data: WiktionaryData,
  lang: LangCode
): string {
  if (!data?.parse?.wikitext) {
    throw new Error("Invalid JSON structure.");
  }

  const wikitext = data.parse.wikitext["*"];
  const language = LANGCODES[lang];
  const languageSection = extractLanguageSection(wikitext, language);

  return extractSubsection(languageSection, "Etymology");
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
