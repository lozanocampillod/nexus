import { getPaginatedLangs } from "@/lib/langcodes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;

  const offset = (page - 1) * limit;
  const paginatedLangs = getPaginatedLangs(offset, limit);

  return new Response(JSON.stringify(paginatedLangs), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
