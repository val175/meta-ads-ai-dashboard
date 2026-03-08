import { NextResponse } from "next/server";
import { createAdCreative } from "@/lib/meta-service";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // In a real scenario, we'd validate the session/auth here
        // before allowing a push to Meta

        const result = await createAdCreative({
            adAccountId: body.accountId,
            name: body.name || `AI Generated - ${Date.now()}`,
            image_url: body.imageUrl,
            body: body.text,
            title: body.headline,
            link_url: body.linkUrl || "https://example.com"
        });

        if (result.error) {
            return NextResponse.json({ error: result.error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
