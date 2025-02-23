import { LangCode, LANGCODES } from "@/lib/langcodes";

export interface WiktionaryData {
  parse: {
    wikitext: {
      "*": string;
    };
  };
}

/**
 * Fetches Wiktionary data for a given word and language.
 *
 * @param word - The word to look up.
 * @param lang - The language code.
 * @returns A promise resolving to the WiktionaryData.
 */
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

/**
 * A generic helper function to extract section lines from an array of lines.
 *
 * @param lines - The array of lines to search through.
 * @param headerRegex - The regex pattern that indicates the start of the section.
 * @param endRegex - The regex pattern that indicates the start of a new section.
 * @param errorMessage - The error message to throw if the section is not found.
 * @returns The array of lines belonging to the section.
 */
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

/**
 * Extracts the language-specific section from raw Wiktionary wikitext.
 *
 * @param wikitext - The complete wikitext fetched from Wiktionary.
 * @param language - The language (e.g., "English") to extract.
 * @returns An array of lines corresponding to the language section.
 */
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

/**
 * Extracts a specific subsection (e.g., Etymology) from a language section.
 *
 * @param sectionLines - The lines of a language section.
 * @param subsectionTitle - The title of the subsection to extract.
 * @returns The content of the subsection as a trimmed string.
 */
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

/**
 * Convenience function to extract the etymology subsection for a given language.
 *
 * @param data - The WiktionaryData fetched.
 * @param lang - The language code.
 * @returns The etymology section content as a string.
 */
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
