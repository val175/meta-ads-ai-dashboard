const META_BASE_URL = "https://graph.facebook.com/v19.0";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const DEFAULT_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

export interface MetaCampaign {
    id: string;
    name: string;
    objective: string;
    status: string;
    effective_status: string;
    buying_type: string;
}

export interface MetaInsights {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    ctr: number;
    cpc: number;
    actions?: Array<{ action_type: string, value: string }>;
    action_values?: Array<{ action_type: string, value: string }>;
    purchase_roas?: Array<{ action_type: string, value: string }>;
    video_3_sec_watched_actions?: Array<{ value: string }>;
    video_thruplay_watched_actions?: Array<{ value: string }>;
}

export interface MetaCampaignWithInsights extends MetaCampaign {
    insights?: MetaInsights;
}

// Utility to ensure account ID has 'act_' prefix
const formatAccountId = (id: string) => id.startsWith('act_') ? id : `act_${id}`;

export async function fetchMetaCampaigns(adAccountId?: string, preset: string = 'last_7d') {
    const targetId = formatAccountId(adAccountId || DEFAULT_AD_ACCOUNT_ID || "");
    if (!ACCESS_TOKEN || !targetId) {
        throw new Error("Missing Meta API credentials or Ad Account ID");
    }

    // Unified fetch: Campaigns + Insights in ONE call
    // Note: actions and purchase_roas are critical for B2B/B2C logic
    const insightsFields = 'spend,impressions,clicks,reach,ctr,cpc,actions,action_values,purchase_roas';
    const fields = `id,name,objective,status,effective_status,buying_type,insights.date_preset(${preset}){${insightsFields}}`;

    const url = `${META_BASE_URL}/${targetId}/campaigns?fields=${fields}&limit=50&access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Meta API error: ${errorBody.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const campaigns = data.data || [];

    // Map nested insights data and parse numeric strings
    return campaigns.map((camp: any) => {
        const ins = camp.insights?.data?.[0];
        if (!ins) return camp;

        return {
            ...camp,
            insights: {
                spend: Number(ins.spend || 0),
                impressions: Number(ins.impressions || 0),
                clicks: Number(ins.clicks || 0),
                reach: Number(ins.reach || 0),
                ctr: Number(ins.ctr || 0),
                cpc: Number(ins.cpc || 0),
                actions: ins.actions || [],
                action_values: ins.action_values || [],
                purchase_roas: ins.purchase_roas || []
            }
        };
    }) as MetaCampaignWithInsights[];
}

export async function fetchInsights(objectId: string, preset: string = 'last_7d') {
    const fields = 'spend,impressions,clicks,reach,ctr,cpc,actions,action_values,purchase_roas';

    // Determine if objectId is an ad account ID or a campaign ID
    // Ad account IDs are typically 15-17 digits, campaign IDs are longer (e.g., 18 digits)
    // If it's an ad account ID (shorter, or starts with 'act_'), format it. Otherwise, use as is.
    const targetId = objectId.startsWith('act_') || objectId.length <= 17 ? formatAccountId(objectId) : objectId;

    const url = `${META_BASE_URL}/${targetId}/insights?fields=${fields}&date_preset=${preset}&access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
        const err = await response.json();
        console.error(`[Meta Service] Insights Error for ${targetId}:`, err.error?.message);
        return undefined;
    }
    const data = await response.json();
    const ins = data.data?.[0];
    if (!ins) return undefined;

    return {
        spend: Number(ins.spend || 0),
        impressions: Number(ins.impressions || 0),
        clicks: Number(ins.clicks || 0),
        reach: Number(ins.reach || 0),
        ctr: Number(ins.ctr || 0),
        cpc: Number(ins.cpc || 0),
        actions: ins.actions || [],
        action_values: ins.action_values || [],
        purchase_roas: ins.purchase_roas || []
    } as MetaInsights;
}

export async function createAdCreative(params: {
    adAccountId?: string;
    name: string;
    image_url: string;
    body: string;
    title: string;
    link_url: string;
}) {
    const targetId = formatAccountId(params.adAccountId || DEFAULT_AD_ACCOUNT_ID || "");
    if (!ACCESS_TOKEN || !targetId) throw new Error("Missing credentials");

    // Step 1: Upload image to Meta (using URL as source)
    const uploadUrl = `${META_BASE_URL}/${targetId}/adimages?access_token=${ACCESS_TOKEN}`;
    const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: params.image_url }),
    });
    const uploadData = await uploadRes.json();
    const imageHash = uploadData.images?.[Object.keys(uploadData.images)[0]]?.hash;

    if (!imageHash) {
        throw new Error(`Failed to upload image: ${JSON.stringify(uploadData.error || uploadData)}`);
    }

    // Step 2: Create Creative
    const creativeUrl = `${META_BASE_URL}/${targetId}/adcreatives?access_token=${ACCESS_TOKEN}`;
    const creativeRes = await fetch(creativeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: params.name,
            object_story_spec: {
                page_id: "PAGE_ID_PLACEHOLDER", // Should be passed from UI or env
                link_data: {
                    image_hash: imageHash,
                    link: params.link_url,
                    message: params.body,
                    name: params.title,
                }
            }
        }),
    });

    return await creativeRes.json();
}

export async function createAd(params: {
    adAccountId?: string;
    name: string;
    adset_id: string;
    creative_id: string;
}) {
    const targetId = formatAccountId(params.adAccountId || DEFAULT_AD_ACCOUNT_ID || "");
    if (!ACCESS_TOKEN || !targetId) throw new Error("Missing credentials");

    const url = `${META_BASE_URL}/${targetId}/ads?access_token=${ACCESS_TOKEN}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: params.name,
            adset_id: params.adset_id,
            creative: { creative_id: params.creative_id },
            status: 'PAUSED', // Safety first: push as paused
        }),
    });

    return await response.json();
}
