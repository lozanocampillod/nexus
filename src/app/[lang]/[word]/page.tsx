import EtymologyGraph from "@/components/EtymologyGraph";

async function fetchEtymologyGraph(word: string, lang: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const response = await fetch(`${baseUrl}/api/${lang}/${word}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch etymology graph for word: ${word}`);
  }
  return await response.json();
}

export default async function Page({
  params,
}: {
  params: Promise<{ word: string; lang: string }>;
}) {
  const { word, lang } = await params;
  const graph = await fetchEtymologyGraph(word, lang);
  return <EtymologyGraph graph={graph} />;
}
