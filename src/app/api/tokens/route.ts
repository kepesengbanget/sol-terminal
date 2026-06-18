// ponytail: thin API route, pass-through to lib
import { NextRequest, NextResponse } from "next/server";
import { searchTokens, getNewPairs } from "@/lib/api";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const isNew = req.nextUrl.searchParams.get("new");

  try {
    const data = isNew ? await getNewPairs() : await searchTokens(q || "");
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
