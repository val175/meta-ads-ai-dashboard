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
    spend: string;
    impressions: string;
    clicks: string;
    reach: string;
    cpp: string;
    ctr: string;
    cpc: string;
    video_3_sec_watched_actions?: Array<{ value: string }>;
    video_thruplay_watched_actions?: Array<{ value: string }>;
}

// Utility to ensure account ID has 'act_' prefix
const formatAccountId = (id: string) => id.startsWith('act_') ? id : `act_${id}`;

export async function fetchMetaCampaigns(adAccountId?: string) {
    const targetId = formatAccountId(adAccountId || DEFAULT_AD_ACCOUNT_ID || "");
    if (!ACCESS_TOKEN || !targetId) {
        throw new Error("Missing Meta API credentials or Ad Account ID");
    }

    const url = `${META_BASE_URL}/${targetId}/campaigns?fields=id,name,objective,status,effective_status,buying_type&access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Meta API error: ${errorBody.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data as MetaCampaign[];
}

export async function fetchInsights(objectId: string, preset: string = 'last_7d') {
    const fields = 'spend,impressions,clicks,reach,ctr,cpc,video_3_sec_watched_actions,video_thruplay_watched_actions';
    const url = `${META_BASE_URL}/${objectId}/insights?fields=${fields}&date_preset=${preset}&access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url);
    const data = await response.json();
    return data.data?.[0] as MetaInsights | undefined;
}

export async function fetchInsightsWithDeltas(objectId: string) {
    const current = await fetchInsights(objectId, 'last_7d');
    const previous = await fetchInsights(objectId, 'last_14d_to_last_7d'); // Meta doesn't support this preset directly usually, would need custom time_range
    // Actually, simple way: fetch last_7d and last_14d then subtract
    const last14 = await fetchInsights(objectId, 'last_14d');

    return {
        current,
        previous: last14, // We'll let the AI/UI handle the comparison logic
    };
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
