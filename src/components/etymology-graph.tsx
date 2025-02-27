"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";

import WordInfoSheet from "@/components/word-info-sheet";
import { EtymologyNode } from "@/lib/etymology";
import { LangCode } from "@/lib/langcodes";
import { dedupGraph, EtymologyGraph } from "@/lib/dedup-graph";
import DendriteSVG from "@/components/dendrite-svg";

export default function EtymologyTree({ graph }: { graph: EtymologyGraph }) {
  const [wordInfo, setWordInfo] = useState<{
    word: string;
    lang: LangCode;
  } | null>(null);

  const handleNodeClick = (word: string, lang: LangCode) => {
    setWordInfo({ word, lang });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <DendriteSVG graph={graph} onNodeClick={handleNodeClick} />
      <WordInfoSheet
        className="min-w-[50vw] p-8 overflow-y-auto"
        word={wordInfo?.word}
        lang={wordInfo?.lang}
        onOpenChange={(isOpen) => !isOpen && setWordInfo(null)}
      />
    </div>
  );
}
