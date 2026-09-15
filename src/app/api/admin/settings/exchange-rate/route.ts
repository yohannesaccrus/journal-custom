import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEurIdrRate, setEurIdrRate } from "@/lib/admin/exchange-rate";
import { FALLBACK_IDR_RATE } from "@/lib/currency";

export async function GET() {
  try {
    const rate = await getEurIdrRate();
    return NextResponse.json({ rate: rate ?? FALLBACK_IDR_RATE, isLive: rate !== null });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { rate } = body as { rate?: number };

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: "rate must be a positive number" }, { status: 400 });
  }

  try {
    await setEurIdrRate(rate);
    return NextResponse.json({ ok: true, rate });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
