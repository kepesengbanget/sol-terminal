import { NextRequest, NextResponse } from "next/server";
import { getPumpTokens, searchPumpTokens } from "@/lib/api";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const sort = req.nextUrl.searchParams.get("sort") || "created_timestamp";

  try {
    const data = q
      ? await searchPumpTokens(q)
      : await getPumpTokens(offset, 30, sort, "DESC");
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
