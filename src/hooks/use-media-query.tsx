import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const result = window.matchMedia(query);
      const onChange = (event: MediaQueryListEvent) => setValue(event.matches);
      result.addEventListener("change", onChange);
      return () => result.removeEventListener("change", onChange);
    }
  }, [query]);

  return value;
}
