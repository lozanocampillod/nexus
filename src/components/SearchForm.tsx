"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LangCode, LANGCODES } from "@/lib/langcodes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface LangData {
  code: LangCode;
  name: string;
}

export default function SearchForm() {
  const router = useRouter();
  const [inputWord, setInputWord] = useState("");
  const [inputLang, setInputLang] = useState("");
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState<LangData[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSearchLanguages = useDebounce(
    useCallback(async (query: string) => {
      if (!query) {
        return;
      }

      setLoading(true);
      try {
        const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/search-lang/${query}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch languages");
        const data = await response.json();
        setLanguages(data);
      } catch (error) {
        console.error("Error fetching search languages:", error);
        setLanguages([]);
      } finally {
        setLoading(false);
      }
    }, []),
    300
  );

  useEffect(() => {
    fetchSearchLanguages(searchQuery);
  }, [fetchSearchLanguages, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim() || !inputLang) return;
    router.push(`/${inputLang}/${encodeURIComponent(inputWord.trim())}`);
  };

  const handleLangSelect = (lang: string) => {
    setInputLang(lang);
    setOpen(false);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col sm:flex-row gap-4 sm:gap-2 w-full"
    >
      <Input
        type="text"
        placeholder="Enter a word"
        value={inputWord}
        onChange={(e) => setInputWord(e.target.value)}
        className="w-full sm:flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="lg:w-[200px] justify-between"
          >
            {inputLang
              ? LANGCODES[inputLang as LangCode]
              : "Select language..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="lg:w-[200px] p-0">
          <Command>
            <CommandInput
              placeholder="Search language..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <CommandEmpty className="py-4 text-center text-xs">
                  Loading...
                </CommandEmpty>
              ) : languages === null ? (
                <CommandEmpty className="py-4 text-center text-xs">
                  Search for a language
                </CommandEmpty>
              ) : languages.length === 0 ? (
                <CommandEmpty className="py-4 text-center text-xs">
                  No languages found
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {languages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={lang.name}
                      onSelect={() => handleLangSelect(lang.code)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          inputLang === lang.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button type="submit" className="w-full sm:w-28">
        Go
      </Button>
    </form>
  );
}
