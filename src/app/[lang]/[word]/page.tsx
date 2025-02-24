import EtymologyGraph from "@/components/etymology-graph";
import { Card, CardContent } from "@/components/ui/card";

async function fetchEtymologyGraph(word: string, lang: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/${lang}/${word}`,
    {
      next: { revalidate: 3600 },
    }
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
  return (
    <Card className="flex-1 flex flex-col w-full max-h-[calc(100vh-14rem)]">
      <CardContent className="flex-1 overflow-y-auto p-0 rounded-xl">
        <EtymologyGraph graph={graph} />
      </CardContent>
    </Card>
  );
}
