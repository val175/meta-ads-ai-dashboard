import { NextRequest, NextResponse } from "next/server";
import { fetchInsights } from "@/lib/meta-service";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const preset = searchParams.get('preset') || 'last_7d';

        const insights = await fetchInsights(accountId || "", preset);
        return NextResponse.json(insights || {});
    } catch (error: any) {
        console.error("[API] Insights Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
