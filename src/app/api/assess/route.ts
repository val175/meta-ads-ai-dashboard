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

      return {
        hookRate: impressions > 0 ? (hook3s / impressions * 100).toFixed(2) : '0',
        holdRate: hook3s > 0 ? (thruPlays / hook3s * 100).toFixed(2) : '0',
      };
    };

    const diag7d = calcDiagnostics(snapshot7d);

    if (!apiKey) {
      return NextResponse.json({
        assessment: `### 🩺 Diagnosis: Creative Fatigue Detected
**Evidence:** Link CTR has dropped 22% in the last 7 days while Frequency has climbed to 3.4. Hook Rate is healthy (${diag7d.hookRate}%), but Hold Rate is lagging at ${diag7d.holdRate}%.
**Prescription:** Pause the current ad. Keep the intro hook but refresh the core body content with a more direct "Benefit-Driven" copy. Expand targeting to a 3% Lookalike audience to lower frequency.`,
        isMock: true
      });
    }

    const PROMPT = `
      You are a seasoned Meta Media Buyer analyzing a ${businessType} account. 
      Analyze these snapshots and provide a "Doctor's Prescription" style report.
      
      CAMPAIGN: ${campaign.name}
      BUSINESS CONTEXT: ${businessType}
      
      SNAPSHOTS:
      - 3-Day (Early Warning): CTR: ${snapshot3d?.ctr || 0}%, Spend: $${snapshot3d?.spend || 0}
      - 7-Day (Standard): CTR: ${snapshot7d?.ctr || 0}%, CPC: $${snapshot7d?.cpc || 0}, Reach: ${snapshot7d?.reach || 0}
      - 28-Day (Macro): CTR: ${snapshot28d?.ctr || 0}%, impressions: ${snapshot28d?.impressions || 0}
      
      CREATIVE DIAGNOSTICS (7-Day):
      - Hook Rate: ${diag7d.hookRate}% (Goal: >25%)
      - Hold Rate: ${diag7d.holdRate}%
      
      STRUCTURE YOUR RESPONSE AS:
      1. **🩺 DIAGNOSIS**: What is the root cause of current performance? (e.g. Creative Fatigue, Landing Page Friction, Targeting issues).
      2. **📊 THE EVIDENCE**: Cite the specific metrics/deltas from the snapshots above.
      3. **💊 THE PRESCRIPTION**: 1-2 immediate, actionable commands (Pause, Duplicate, Refresh Hook, etc.).
      
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
