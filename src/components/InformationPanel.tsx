"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LangCode, LANGCODES } from "@/lib/langcodes";
import { extractEtymologySection, fetchWiktionaryData } from "@/lib/wiktionary";
import { searchWordAtom } from "@/store/atom";
import { useAtom } from "jotai";

export default function WordInfoPanel({}: {}) {
  const [searchWord] = useAtom(searchWordAtom);
  const [etymology, setEtymology] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEtymology() {
      if (searchWord.word && searchWord.lang) {
        const data = await fetchWiktionaryData(
          searchWord.word,
          searchWord.lang as LangCode
        );
        setEtymology(
          extractEtymologySection(data, searchWord.lang as LangCode)
        );
      }
    }
    fetchEtymology();
  }, [searchWord]);

  return (
    <div className="w-1/3 border-l border-gray-300 p-8 overflow-y-auto">
      {etymology ? (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{searchWord.word}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 font-mono mb-6">
              {LANGCODES[searchWord.lang]}
            </div>
            <pre className="text-left text-xs whitespace-pre-wrap">
              {etymology}
            </pre>
          </CardContent>
        </Card>
      ) : (
        <div className="text-gray-500">
          Click a word in the tree or use the search input to see details.
        </div>
      )}
    </div>
  );
}
