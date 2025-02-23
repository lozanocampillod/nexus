"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LANGCODES } from "@/lib/langcodes";

export default function SearchForm({ initialLang }: { initialLang: string }) {
  const router = useRouter();
  const [inputWord, setInputWord] = useState("");
  const [inputLang, setInputLang] = useState(initialLang);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord) return;
    router.push(`/${inputLang}/${encodeURIComponent(inputWord)}`);
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
      <select
        value={inputLang}
        onChange={(e) => setInputLang(e.target.value)}
        className="p-2 border border-gray-200 rounded-md w-full sm:w-48"
      >
        {Object.entries(LANGCODES).map(([code, language]) => (
          <option key={code} value={code}>
            {language}
          </option>
        ))}
      </select>
      <Button type="submit" className="w-full sm:w-auto">
        Go
      </Button>
    </form>
  );
}
