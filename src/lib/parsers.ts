import { LangCode } from "@/lib/langcodes";

type ParserFunction = (parts: string[]) => Record<string, any>;

const shortcuts: Record<string, string> = {
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
};

export interface TemplateNode {
  type: string;
  targetLang?: LangCode;
  srcLang?: LangCode;
  word: string;
  note?: string;
}

const parsers: Record<string, ParserFunction> = {
  inherits: (parts: string[]): TemplateNode => {
    return {
      type: "inh",
      targetLang: parts[1] as LangCode,
      srcLang: parts[2] as LangCode,
      word: parts[3],
    };
  },
  derived: (parts: string[]): TemplateNode => {
    return {
      type: "der",
      targetLang: parts[1] as LangCode,
      srcLang: parts[2] as LangCode,
      word: parts[3],
    };
  },
  mention: (parts: string[]): TemplateNode => {
    return {
      type: "m",
      srcLang: parts[1] as LangCode,
      word: parts[2],
      note: parts[4] || "",
    };
  },
  cognate: (parts: string[]): TemplateNode => {
    return {
      type: "cog",
      srcLang: parts[1] as LangCode,
      word: parts[2],
    };
  },
  etymon: (parts: string[]): TemplateNode => {
    return {
      type: "etymon",
      srcLang: parts[3] as LangCode,
      word: parts[4].split(">")[0],
    };
  },
};

export function parseTemplates(templates: string[]): TemplateNode[] {
  const parts = templates.map((template) =>
    template.split("|").map((p) => p.trim())
  );

  return parts
    .map((parts) => {
      const type = parts[0];
      const fullType = shortcuts[type] || type;
      if (fullType in parsers) {
        return parsers[fullType](parts);
      }
      return undefined;
    })
    .filter(Boolean) as TemplateNode[];
}
