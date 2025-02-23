import { LangCode } from "@/lib/langcodes";
import { atom } from "jotai";

export const searchWordAtom = atom<{ word?: string; lang?: LangCode }>({});
