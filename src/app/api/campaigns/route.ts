import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/meta-service";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const preset = searchParams.get('preset') || 'last_7d';

        const campaigns = await fetchMetaCampaigns(accountId || undefined, preset);
        return NextResponse.json(campaigns);
    } catch (error: any) {
        console.error("[API] Campaigns Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

