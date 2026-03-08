export interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  roas: number;
  aiAssessment?: string;
}

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Retargeting - Cart Abandoners - Spring 2024',
    status: 'ACTIVE',
    spend: 1250.50,
    impressions: 45000,
    clicks: 1200,
    ctr: 2.67,
    cpc: 1.04,
    roas: 4.2,
    aiAssessment: "Strong performance but frequency is creeping up (3.2). Recommend rotating creative to prevent fatigue."
  },
  {
    id: '2',
    name: 'Prospecting - Lookalike 1% Customers',
    status: 'ACTIVE',
    spend: 3400.00,
    impressions: 120000,
    clicks: 1800,
    ctr: 1.5,
    cpc: 1.88,
    roas: 2.8,
    aiAssessment: "CPM is higher than average (28.33). Consider testing broader targeting concepts to lower costs."
  },
  {
    id: '3',
    name: 'Lead Gen - Whitepaper Download - HR Managers',
    status: 'PAUSED',
    spend: 500.25,
    impressions: 15000,
    clicks: 450,
    ctr: 3.0,
    cpc: 1.11,
    roas: 0, // N/A for Lead Gen
    aiAssessment: "Great CTR! Re-enable with expanded budget if lead quality from the CRM is verified."
  }
];
