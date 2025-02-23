"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LangCode, LANGCODES } from "@/lib/langcodes";
import { extractEtymologySection, fetchWiktionaryData } from "@/lib/wiktionary";
import { searchWordAtom } from "@/store/atom";
import { useAtom } from "jotai";
import { Skeleton } from "@/components/ui/skeleton";

export default function WordInfoPanel({ className }: { className: string }) {
  const [{ word, lang }, setSearchWord] = useAtom(searchWordAtom);
  const [etymology, setEtymology] = useState<string | null>(null);

  useEffect(() => {
    setEtymology(null);
    (async () => {
      if (word && lang) {
        const data = await fetchWiktionaryData(word, lang);
        setEtymology(extractEtymologySection(data, lang));
      }
    })();
  }, [word, lang]);

  return (
    <div
      className={`w-1/3 border-l border-gray-300 p-8 overflow-y-auto ${className}`}
    >
      {word && lang ? (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{word}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 font-mono mb-6">
              {LANGCODES[lang]}
            </div>
            {etymology ? (
              <pre className="text-left text-xs whitespace-pre-wrap">
                {etymology}
              </pre>
            ) : (
              <div className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}
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
