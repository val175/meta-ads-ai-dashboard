import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/meta-service";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        const campaigns = await fetchMetaCampaigns(accountId || undefined);
        return NextResponse.json(campaigns);
    } catch (error: any) {
        console.warn("Meta API Error or Missing Credentials. Falling back to mock data.", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

