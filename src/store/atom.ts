import { atom } from "jotai";

export const searchWordAtom = atom<{ word?: string; lang?: string }>({});
