import EtymologyGraph from "@/app/components/EtymologyGraph";

async function fetchEtymologyGraph(word: string, lang: string) {
  const response = await fetch(
    process.env.BASE_URL + `/api/lang/${lang}/word/${word}`
  );
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
