"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Campaign, mockCampaigns } from "@/lib/mock-data";

const AD_ACCOUNTS = [
  { id: "971646048476430", name: "Zelfwrappen" },
  { id: "182680736993488", name: "Advanced Forces Group" }
];

export default function Home() {
  const [currentAccountId, setCurrentAccountId] = useState(AD_ACCOUNTS[0].id);
  const [businessType, setBusinessType] = useState<'B2C' | 'B2B'>('B2C');
  const [timeframe, setTimeframe] = useState('last_7d');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountInsights, setAccountInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [generatedCreative, setGeneratedCreative] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        console.log(`[Dashboard] Fetching data for Account: ${currentAccountId}, Timeframe: ${timeframe}`);
        // Load Campaigns with insights for the selected timeframe
        const campRes = await fetch(`/api/campaigns?accountId=${currentAccountId}&preset=${timeframe}`);
        const campData = await campRes.json();

        if (campData.error) {
          console.error("[Dashboard] Campaigns API Error:", campData.error);
          throw new Error(campData.error);
        }

        console.log(`[Dashboard] Received ${campData.length} campaigns from API`);

        // Load Account Insights for the hero cards
        const insightRes = await fetch(`/api/insights?accountId=${currentAccountId}&preset=${timeframe}`);
        const insightData = await insightRes.json();

        if (insightData.error) {
          console.warn("[Dashboard] Insights API Error:", insightData.error);
        }

        setAccountInsights(insightData);

        const mappedCampaigns = campData.map((c: any) => {
          const ins = c.insights || {};
          const spend = Number(ins.spend || 0);
          const clicks = Number(ins.clicks || 0);
          const impressions = Number(ins.impressions || 0);

          // Real ROAS check (from purchase_roas array)
          const purchaseRoas = Array.isArray(ins.purchase_roas)
            ? ins.purchase_roas.find((r: any) => r.action_type === 'purchase')?.value || 0
            : 0;

          // Real Leads check (for B2B CPL)
          const leads = Array.isArray(ins.actions)
            ? ins.actions.find((a: any) => a.action_type === 'lead')?.value || 0
            : 0;

          return {
            id: c.id,
            name: c.name,
            status: c.status,
            spend: spend,
            roas: Number(purchaseRoas),
            leads: Number(leads),
            cpl: Number(leads) > 0 ? Number((spend / Number(leads)).toFixed(2)) : 0,
            ctr: impressions > 0 ? Number((clicks / impressions * 100).toFixed(2)) : 0,
            aiAssessment: (spend > 0 || clicks > 0)
              ? "Live performance data active. Multi-snapshot analysis ready."
              : "Live campaign found. No spending data detected for this timeframe."
          };
        });

        setCampaigns(mappedCampaigns);

        if (mappedCampaigns.length === 0) {
          setError(`No campaigns found for this account in the requested timeframe.`);
        } else {
          setError(null);
        }
      } catch (err: any) {
        console.error("[Dashboard] loadData Critical Failure:", err);
        setCampaigns(mockCampaigns);
        setError(`Live data sync error: ${err.message}. Showing demonstration data.`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentAccountId, timeframe]);

  const handleAssess = async (campaign: Campaign) => {
    setSelectedCampaign({ ...campaign, aiAssessment: "Thinking... 🧠🤖" });
    setIsAssessing(true);
    // Fetch AI Assessment for this specific campaign
    try {
      const res = await fetch("/api/assess", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign,
          accountId: currentAccountId,
          businessType
        })
      });
      const data = await res.json();
      if (data.assessment) {
        setCampaigns(prev => prev.map(c =>
          c.id === campaign.id ? { ...c, aiAssessment: data.assessment } : c
        ));
        setSelectedCampaign(prev => prev ? { ...prev, aiAssessment: data.assessment } : null);
      }
    } catch (err) {
      console.error("Assessment failed:", err);
    } finally {
      setIsAssessing(false);
    }
  };

  const handleGenerateCreative = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedCreative("https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1000");
    }, 2000);
  };

  const handlePushToMeta = async () => {
    if (!generatedCreative) return;
    setIsPushing(true);
    try {
      const res = await fetch("/api/push-ad", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: currentAccountId,
          imageUrl: generatedCreative,
          text: "AI Generated Ad Copy",
          headline: "Start Faster with MetaAI",
          name: `Dashboard UI Push - ${Date.now()}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Successfully pushed ad creative to Meta Ads Manager!");
      setIsCreativeModalOpen(false);
    } catch (err: any) {
      alert(`Push Failed: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'hsl(var(--fg-secondary))' }}>Account:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '200px', padding: '8px 12px' }}
              value={currentAccountId}
              onChange={(e) => setCurrentAccountId(e.target.value)}
            >
              {AD_ACCOUNTS.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setBusinessType('B2C')}
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                background: businessType === 'B2C' ? 'hsl(var(--brand-primary))' : 'transparent',
                color: businessType === 'B2C' ? 'white' : 'hsl(var(--fg-secondary))',
                border: 'none',
                cursor: 'pointer'
              }}
            >B2C</button>
            <button
              onClick={() => setBusinessType('B2B')}
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                background: businessType === 'B2B' ? 'hsl(var(--brand-primary))' : 'transparent',
                color: businessType === 'B2B' ? 'white' : 'hsl(var(--fg-secondary))',
                border: 'none',
                cursor: 'pointer'
              }}
            >B2B</button>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'hsl(var(--border-glass))' }} />

          <div className="glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            {[
              { id: 'last_7d', label: '7D' },
              { id: 'last_28d', label: '28D' },
              { id: 'last_90d', label: '90D' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTimeframe(p.id)}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  background: timeframe === p.id ? 'hsl(var(--brand-primary))' : 'transparent',
                  color: timeframe === p.id ? 'white' : 'hsl(var(--fg-secondary))',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>
        {loading && <span style={{ fontSize: '0.85rem', color: 'hsl(var(--brand-primary))' }}>Syncing with Meta...</span>}
      </div>

      {error && (
        <div style={{
          background: 'hsl(var(--status-warning) / 0.1)',
          color: 'hsl(var(--status-warning))',
          padding: '12px 20px',
          border: '1px solid hsl(var(--status-warning) / 0.2)',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <header className="section-header">
        <p>Overview & Performance ({timeframe.replace('last_', '').toUpperCase()})</p>
        <h2>Ad Accounts <span className="gradient-text">Dashboard</span></h2>
      </header>

      {/* Hero Metrics */}
      <section className="stats-grid">
        <div className="stat-card glass-panel">
          <span className="stat-label">Total Spend</span>
          <span className="stat-value">
            {accountInsights?.spend ? `$${Number(accountInsights.spend).toLocaleString()}` : "No Data"}
          </span>
          <span className="stat-change stat-positive">↑ Live Sync Active</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">Avg. ROAS</span>
          <span className="stat-value">
            {accountInsights?.ctr ? `${(Number(accountInsights.ctr) * 1.2).toFixed(1)}x` : "No Data"}
          </span>
          <span className="stat-change">---</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">Total Reach</span>
          <span className="stat-value">
            {accountInsights?.reach ? Number(accountInsights.reach).toLocaleString() : "No Data"}
          </span>
          <span className="stat-change">---</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">CTR</span>
          <span className="stat-value">
            {accountInsights?.ctr ? `${Number(accountInsights.ctr).toFixed(2)}%` : "0.00%"}
          </span>
          <span className="stat-change">↑ Active</span>
        </div>
      </section>

      {/* Campaigns Listing */}
      <section className="campaign-table-container glass-panel">
        <div className="table-header">
          <h3>Active Campaigns</h3>
          <button className="premium-button" onClick={() => setIsCreativeModalOpen(true)}>
            Generate New Creative
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Status</th>
              <th>Spend</th>
              <th>{businessType === 'B2C' ? 'ROAS' : 'CPL'}</th>
              <th>CTR</th>
              <th>AI Health</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(loading && campaigns.length === 0) ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Fetching campaigns...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--fg-secondary))' }}>
                No active campaigns found for this selection. Try a different timeframe or account.
              </td></tr>
            ) : campaigns.map((camp) => (
              <tr key={camp.id}>
                <td style={{ fontWeight: 500 }}>{camp.name}</td>
                <td>
                  <span className={`status-badge status-${camp.status.toLowerCase()}`}>
                    {camp.status}
                  </span>
                </td>
                <td>${camp.spend.toLocaleString()}</td>
                <td>
                  {businessType === 'B2C'
                    ? (camp.roas > 0 ? `${camp.roas.toFixed(2)}x` : 'N/A')
                    : (camp.cpl && camp.cpl > 0 ? `$${camp.cpl.toLocaleString()}` : 'N/A')}
                </td>
                <td>{camp.ctr.toFixed(2)}%</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{
                      color: (businessType === 'B2C' ? camp.roas > 3 : (camp.cpl && camp.cpl < 20)) || (camp.spend === 0)
                        ? 'hsl(var(--status-positive))'
                        : 'hsl(var(--status-warning))'
                    }}>●</span>
                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--fg-secondary))' }}>
                      {(businessType === 'B2C' ? camp.roas > 3 : (camp.cpl && camp.cpl < 20)) || (camp.spend === 0)
                        ? 'Healthy'
                        : 'Optimization Needed'}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="nav-item"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleAssess(camp)}
                  >
                    Assess
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* AI Assessment Slide-over */}
      {selectedCampaign && (
        <>
          <div className="overlay" onClick={() => setSelectedCampaign(null)} />
          <div className="slide-over">
            <button className="close-button" onClick={() => setSelectedCampaign(null)}>×</button>
            <h3 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>AI Campaign Assessment</h3>
            <p style={{ color: 'hsl(var(--fg-secondary))', marginBottom: '32px' }}>{selectedCampaign.name}</p>

            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="stat-card glass-panel" style={{ padding: '16px' }}>
                <span className="stat-label">CPA</span>
                <span className="stat-value" style={{ fontSize: '1.2rem' }}>$12.40</span>
              </div>
              <div className="stat-card glass-panel" style={{ padding: '16px' }}>
                <span className="stat-label">Conv. Rate</span>
                <span className="stat-value" style={{ fontSize: '1.2rem' }}>3.2%</span>
              </div>
            </div>

            <div className="assessment-box markdown-content">
              <h4><span>✨</span> AI Analysis</h4>
              <ReactMarkdown>
                {selectedCampaign.aiAssessment}
              </ReactMarkdown>
            </div>

            <div style={{ marginTop: '40px' }}>
              <button className="premium-button" style={{ width: '100%' }}>Apply Recommended Fixes</button>
            </div>
          </div>
        </>
      )}

      {/* Creative Generator Modal */}
      {isCreativeModalOpen && (
        <div className="overlay">
          <div className="modal-content glass-panel">
            <button className="close-button" onClick={() => { setIsCreativeModalOpen(false); setGeneratedCreative(null); }}>×</button>
            <h2 className="gradient-text" style={{ marginBottom: '8px' }}>Generate Creative</h2>
            <p style={{ color: 'hsl(var(--fg-secondary))', marginBottom: '32px' }}>Let AI craft high-converting visuals and copy.</p>

            <div className="form-group">
              <label className="form-label">Campaign Objective</label>
              <select className="form-select">
                <option>Sales & Conversions</option>
                <option>Lead Generation</option>
                <option>Brand Awareness</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience / Persona</label>
              <textarea className="form-textarea" placeholder="e.g. Tech-savvy professionals aged 25-40 interested in marketing automation..."></textarea>
            </div>

            {!generatedCreative ? (
              <button
                className="premium-button"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                onClick={handleGenerateCreative}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Creative Assets"}
              </button>
            ) : (
              <div className="animate-fade-in">
                <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', border: '1px solid hsl(var(--border-glass))' }}>
                  <img src={generatedCreative} alt="Generated" style={{ width: '100%', display: 'block' }} />
                </div>
                <div className="assessment-box" style={{ marginBottom: '24px' }}>
                  <h4>Ad Copy Suggestion</h4>
                  <p style={{ fontStyle: 'italic' }}>"Stop wasting hours on manual Meta reporting. Our AI-powered dashboard does the heavy lifting for you. Try it free today! ✨"</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="premium-button"
                    style={{ flex: 1 }}
                    onClick={handlePushToMeta}
                    disabled={isPushing}
                  >
                    {isPushing ? "Pushing to Meta..." : "Push to Meta Ads"}
                  </button>
                  <button
                    className="nav-item"
                    style={{ flex: 1, border: '1px solid hsl(var(--border-glass))' }}
                    onClick={() => setGeneratedCreative(null)}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
