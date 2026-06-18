import { NextRequest, NextResponse } from "next/server";
import { getPumpTokens, searchPumpTokens, getCreatorCoins } from "@/lib/api";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const sort = req.nextUrl.searchParams.get("sort") || "created_timestamp";
  const filter = req.nextUrl.searchParams.get("filter"); // "first" = only deployed=1

  try {
    const data = q
      ? await searchPumpTokens(q)
      : await getPumpTokens(offset, 30, sort, "DESC");

    // Enrich with creator deployed count
    const creators = [...new Set(data.map((t: any) => t.creator).filter(Boolean))];
    const stats = await Promise.all(
      creators.map((c) => getCreatorCoins(c).catch(() => ({ creator: c, totalCoins: 0, coins: [] })))
    );
    const creatorMap = new Map(stats.map((s) => [s.creator, s.totalCoins]));

    let enriched = data.map((t: any) => ({
      ...t,
      deployedCount: creatorMap.get(t.creator) || 0,
    }));

    // Filter hanya dev yang pertama kali deploy
    if (filter === "first") {
      enriched = enriched.filter((t: any) => t.deployedCount === 1);
    }

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
