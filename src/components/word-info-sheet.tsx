"use client";

import { useEffect, useState } from "react";
import { LangCode, LANGCODES } from "@/lib/langcodes";
import { extractEtymologySection, fetchWiktionaryData } from "@/lib/wiktionary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function WordInfoSheet({
  className,
  word,
  lang,
  onOpenChange,
}: {
  className?: string;
  word?: string;
  lang?: LangCode;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [etymology, setEtymology] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    setEtymology(null);
    setOpen(!!word && !!lang);

    (async () => {
      if (!word || !lang) return;
      try {
        const data = await fetchWiktionaryData(word, lang);
        setEtymology(extractEtymologySection(data, lang));
      } catch {
        setEtymology("Unable to fetch etymology");
      }
    })();
  }, [word, lang]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={className}>
        <div className="flex flex-col h-full">
          <SheetHeader className="flex-none">
            <SheetTitle>
              {word}
              <div className="text-sm text-gray-500 font-mono mb-4">
                {LANGCODES[lang as LangCode]}
              </div>
            </SheetTitle>
            <SheetClose />
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overflow-x-wrap min-h-0 max-h-[50vh]">
            {etymology ? (
              <pre className="text-left text-xs text-wrap ">{etymology}</pre>
            ) : (
              <div className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
