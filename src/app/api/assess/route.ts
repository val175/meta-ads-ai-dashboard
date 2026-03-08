import { NextRequest, NextResponse } from "next/server";
import { fetchInsights } from "@/lib/meta-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign, accountId, businessType = 'B2C' } = body;

    const apiKey = process.env.AI_API_KEY;

    // Fetch multi-timeframe snapshots for deeper analysis
    const [snapshot3d, snapshot7d, snapshot28d] = await Promise.all([
      fetchInsights(campaign.id, 'last_3d'),
      fetchInsights(campaign.id, 'last_7d'),
      fetchInsights(campaign.id, 'last_28d'),
    ]);

    // Helper to calculate diagnostic metrics
    const calcDiagnostics = (ins: any) => {
      const impressions = Number(ins?.impressions || 0);
      const hook3s = Number(ins?.video_3_sec_watched_actions?.[0]?.value || 0);
      const thruPlays = Number(ins?.video_thruplay_watched_actions?.[0]?.value || 0);

      const leads = Number(ins?.actions?.find((a: any) => a.action_type === 'lead')?.value || 0);
      const roas = Number(ins?.purchase_roas?.find((r: any) => r.action_type === 'purchase')?.value || 0);

      return {
        impressions,
        spend: Number(ins?.spend || 0),
        ctr: Number(ins?.ctr || 0),
        cpc: Number(ins?.cpc || 0),
        leads,
        cpl: leads > 0 ? (Number(ins?.spend || 0) / leads).toFixed(2) : '0',
        roas,
        hookRate: impressions > 0 ? (hook3s / impressions * 100).toFixed(2) : '0',
        holdRate: hook3s > 0 ? (thruPlays / hook3s * 100).toFixed(2) : '0',
        isVideo: hook3s > 0 || thruPlays > 0
      };
    };

    const diag3d = calcDiagnostics(snapshot3d);
    const diag7d = calcDiagnostics(snapshot7d);
    const diag28d = calcDiagnostics(snapshot28d);

    const isVideo = diag7d.isVideo;
    const formatInfo = isVideo ? `FORMAT: Video Ad` : `FORMAT: Static Image / Carousel (No video metrics applicable)`;

    const conversionStats = businessType === 'B2B'
      ? `LEAD STATS (7-Day): Leads: ${diag7d.leads}, CPL: $${diag7d.cpl}`
      : `E-COMMERCE STATS (7-Day): ROAS: ${diag7d.roas}x`;

    const videoDiagnostics = isVideo ? `
      CREATIVE DIAGNOSTICS (7-Day):
      - Hook Rate: ${diag7d.hookRate}% (Goal: >25%)
      - Hold Rate: ${diag7d.holdRate}%` : "";

    if (!apiKey) {
      return NextResponse.json({
        assessment: `### 🩺 Diagnosis: ${businessType === 'B2B' ? 'High CPL Detected' : 'Creative Fatigue Detected'}
**Evidence:** Link CTR is ${diag7d.ctr}%. ${conversionStats}. ${isVideo ? `Hook Rate is ${diag7d.hookRate}%` : 'This is a static ad.'}
**Prescription:** ${businessType === 'B2B' ? 'Verify lead quality from CRM. If valid, scale budget by 20%.' : 'Pause current ad. Refresh core body content with a more direct "Benefit-Driven" copy.'}`,
        isMock: true
      });
    }

    const PROMPT = `
      You are a seasoned Meta Media Buyer analyzing a ${businessType} account. 
      Analyze these snapshots and provide a "Doctor's Prescription" style report.
      
      CAMPAIGN: ${campaign.name}
      AD FORMAT: ${formatInfo}
      BUSINESS CONTEXT: ${businessType}
      
      ${conversionStats}
      ${videoDiagnostics}
      
      SNAPSHOTS:
      - 3-Day (Early Warning): CTR: ${diag3d.ctr}%, Spend: $${diag3d.spend}
      - 7-Day (Standard): CTR: ${diag7d.ctr}%, CPC: $${diag7d.cpc}, Reach: ${snapshot7d?.reach || 0}
      - 28-Day (Macro): CTR: ${diag28d.ctr}%, Impressions: ${diag28d.impressions}
      
      STRUCTURE YOUR RESPONSE AS:
      1. **🩺 DIAGNOSIS**: What is the root cause of current performance? (e.g. Creative Fatigue, Landing Page Friction, Targeting issues).
      2. **📊 THE EVIDENCE**: Cite specific metrics/deltas (especially ${businessType === 'B2B' ? 'Leads/CPL' : 'ROAS'}) from the snapshots.
      3. **💊 THE PRESCRIPTION**: 1-2 immediate, actionable commands (Pause, scale, Refresh Hook, etc.).
      
      CRITICAL: ${isVideo ? 'Comment on video hooks.' : 'Do NOT mention video hooks or 3s views, this is a static ad.'}
      Keep it punchy, technical, and strategic. Use Markdown.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }] }]
      })
    });

    const data = await response.json();
    const assessment = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI analysis unavailable.";

    return NextResponse.json({ assessment });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
