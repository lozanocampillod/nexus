import { LangCode, LANGCODES } from "@/lib/langcodes";

type ParserFunction = (parts: string[]) => Record<string, any>;

const SHORTCUTS: Record<string, string> = {
  der: "derived",
  bor: "borrowed",
  lbor: "learned borrowing",
  obor: "orthographic borrowing",
  inh: "inherited",
  "PIE root": "PIE root",
  af: "affix",
  pre: "prefix",
  con: "confix",
  suf: "suffix",
  com: "compound",
  blend: "blend",
  clipping: "clipping",
  "short for": "short for",
  bf: "back-form",
  backformation: "back-form",
  dbt: "doublet",
  onom: "onomatopoeic",
  cal: "calque",
  clq: "calque",
  sl: "semantic loan",
  "named-after": "named-after",
  psm: "phono-semantic matching",
  m: "mention",
  cog: "cognate",
  noncog: "noncognate",
  "m+": "langname-mention",
  rfe: "rfe",
  etystub: "etystub",
  unk: "unknown",
  unc: "uncertain",
  "inh+": "inherited",
};

export const EXCLUDED_ROOT_TEMPLATES = ["root", "cognate", "base"];

export interface TemplateNode {
  type: string;
  targetLang?: LangCode;
  srcLang?: LangCode;
  word: string;
  note?: string;
}

const parsers: Record<string, ParserFunction> = {
  inherited: (parts: string[]): TemplateNode => {
    return {
      type: "inherited",
      targetLang: parts[1] as LangCode,
      srcLang: parts[2] as LangCode,
      word: parts[3],
    };
  },
  derived: (parts: string[]): TemplateNode => {
    return {
      type: "derived",
      targetLang: parts[1] as LangCode,
      srcLang: parts[2] as LangCode,
      word: parts[3],
    };
  },
  mention: (parts: string[]): TemplateNode => {
    return {
      type: "mention",
      srcLang: parts[1] as LangCode,
      word: parts[2],
      note: parts[4] || "",
    };
  },
  cognate: (parts: string[]): TemplateNode => {
    return {
      type: "cognate",
      srcLang: parts[1] as LangCode,
      word: parts[2],
    };
  },
  etymon: (parts: string[]): TemplateNode => {
    const arrowSection = parts.find((part) => part.includes(">"));
    const arrowSectionParts = arrowSection?.split(">");
    return {
      type: "etymon",
      srcLang: LANGCODES[arrowSectionParts[0]]
        ? arrowSectionParts[0]
        : (parts[1] as LangCode),
      word: LANGCODES[arrowSectionParts[0]]
        ? arrowSectionParts[1]
        : arrowSectionParts[0],
    };
  },
  borrowed: (parts: string[]): TemplateNode => {
    return {
      type: "borrowed",
      targetLang: parts[1] as LangCode,
      srcLang: parts[2] as LangCode,
      word: parts[3],
    };
  },
};

export function parseTemplates(templates: string[]): TemplateNode[] {
  const parts = templates.map((template) =>
    template.split("|").map((p) => p.trim())
  );

  return parts
    .map((parts, i) => {
      const type = parts[0];
      const fullType = SHORTCUTS[type] || type;
      if (fullType in parsers) {
        try {
          return parsers[fullType](parts);
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    })
    .filter(Boolean) as TemplateNode[];
}
