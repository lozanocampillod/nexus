import EtymologyGraph from "@/app/components/EtymologyGraph";

async function fetchEtymologyGraph(word: string) {
  const response = await fetch(process.env.BASE_URL + `/api/words/${word}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch etymology graph for word: ${word}`);
  }
  return await response.json();
}

export default async function Page({
  params,
}: {
  params: Promise<{ word: string }>;
}) {
  const word = (await params).word;
  const graph = await fetchEtymologyGraph(word);
  return <EtymologyGraph graph={graph} />;
}
