import { NextRequest, NextResponse } from "next/server";
import { rugCheck } from "@/lib/api";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  try {
    const data = await rugCheck(address);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
