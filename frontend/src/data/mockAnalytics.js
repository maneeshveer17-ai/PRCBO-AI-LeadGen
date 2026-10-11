// Analytics and Chart Data for PRCBO LeadGen Platform

export const mockTrendData = [
  { day: "Sep 05", leads: 42, hotLeads: 8, converted: 2 },
  { day: "Sep 08", leads: 58, hotLeads: 12, converted: 3 },
  { day: "Sep 11", leads: 64, hotLeads: 15, converted: 4 },
  { day: "Sep 14", leads: 72, hotLeads: 19, converted: 5 },
  { day: "Sep 17", leads: 85, hotLeads: 24, converted: 7 },
  { day: "Sep 20", leads: 91, hotLeads: 28, converted: 8 },
  { day: "Sep 23", leads: 110, hotLeads: 33, converted: 11 },
  { day: "Sep 26", leads: 125, hotLeads: 38, converted: 14 },
  { day: "Sep 29", leads: 142, hotLeads: 46, converted: 18 },
  { day: "Oct 02", leads: 168, hotLeads: 54, converted: 21 },
  { day: "Oct 04", leads: 195, hotLeads: 62, converted: 25 }
];

export const mockTrendData7Days = [
  { day: "Sep 28", leads: 135, hotLeads: 42, converted: 16 },
  { day: "Sep 29", leads: 142, hotLeads: 46, converted: 18 },
  { day: "Sep 30", leads: 150, hotLeads: 49, converted: 19 },
  { day: "Oct 01", leads: 158, hotLeads: 51, converted: 20 },
  { day: "Oct 02", leads: 168, hotLeads: 54, converted: 21 },
  { day: "Oct 03", leads: 180, hotLeads: 58, converted: 23 },
  { day: "Oct 04", leads: 195, hotLeads: 62, converted: 25 }
];

export const mockTrendDataToday = [
  { day: "09:00", leads: 12, hotLeads: 3, converted: 1 },
  { day: "11:00", leads: 28, hotLeads: 7, converted: 2 },
  { day: "13:00", leads: 45, hotLeads: 12, converted: 4 },
  { day: "15:00", leads: 64, hotLeads: 18, converted: 6 },
  { day: "17:00", leads: 82, hotLeads: 23, converted: 8 },
  { day: "19:00", leads: 96, hotLeads: 28, converted: 10 }
];

export const mockTrendData90Days = [
  { day: "Jul 15", leads: 22, hotLeads: 4, converted: 1 },
  { day: "Jul 30", leads: 38, hotLeads: 7, converted: 2 },
  { day: "Aug 15", leads: 52, hotLeads: 11, converted: 3 },
  { day: "Aug 30", leads: 74, hotLeads: 18, converted: 5 },
  { day: "Sep 15", leads: 112, hotLeads: 32, converted: 9 },
  { day: "Sep 30", leads: 155, hotLeads: 50, converted: 19 },
  { day: "Oct 04", leads: 195, hotLeads: 62, converted: 25 }
];

export const mockStatusDistribution = [
  { name: "New", value: 412, color: "#3B82F6", percentage: 28 },
  { name: "Contacted", value: 530, color: "#8B5CF6", percentage: 35 },
  { name: "Follow-up", value: 324, color: "#F59E0B", percentage: 22 },
  { name: "Converted", value: 148, color: "#10B981", percentage: 10 },
  { name: "Rejected", value: 76, color: "#EF4444", percentage: 5 }
];

export const mockServiceDistribution = [
  { service: "Web Development", leads: 680, hot: 142, growth: "+18%", color: "#FF7A00", avgDeal: "₹1.4L" },
  { service: "AI Development", leads: 520, hot: 118, growth: "+34%", color: "#8B5CF6", avgDeal: "₹3.8L" },
  { service: "IoT Solutions", leads: 410, hot: 95, growth: "+27%", color: "#06B6D4", avgDeal: "₹4.5L" },
  { service: "UI/UX Design", leads: 360, hot: 68, growth: "+14%", color: "#EC4899", avgDeal: "₹85k" },
  { service: "Digital Marketing", leads: 320, hot: 54, growth: "+11%", color: "#10B981", avgDeal: "₹65k" },
  { service: "Graphic Design", leads: 196, hot: 32, growth: "+6%", color: "#F59E0B", avgDeal: "₹35k" }
];

export const mockScoreDistribution = [
  { range: "0 - 20", count: 84, label: "Unqualified", color: "#94A3B8", criteria: "No digital footprint, inactive registry" },
  { range: "21 - 40", count: 210, label: "Low Potential", color: "#64748B", criteria: "Minimal engagement, basic listing" },
  { range: "41 - 60", count: 540, label: "Medium Potential", color: "#F59E0B", criteria: "Active business, legacy web setup" },
  { range: "61 - 80", count: 980, label: "High Potential", color: "#10B981", criteria: "High local search volume, high budget" },
  { range: "81 - 100", count: 672, label: "Hot & Ready", color: "#FF7A00", criteria: "Immediate tech modernization trigger" }
];

export const mockLocationDistribution = [
  { city: "Madurai", state: "Tamil Nadu", leads: 620, hot: 145, pct: 25, velocity: "3.8d", avgScore: 84 },
  { city: "Chennai", state: "Tamil Nadu", leads: 740, hot: 182, pct: 30, velocity: "2.4d", avgScore: 88 },
  { city: "Coimbatore", state: "Tamil Nadu", leads: 480, hot: 110, pct: 19, velocity: "4.1d", avgScore: 86 },
  { city: "Trichy", state: "Tamil Nadu", leads: 260, hot: 58, pct: 10, velocity: "5.2d", avgScore: 79 },
  { city: "Bengaluru", state: "Karnataka", leads: 240, hot: 72, pct: 10, velocity: "2.9d", avgScore: 91 },
  { city: "Hyderabad", state: "Telangana", leads: 146, hot: 45, pct: 6, velocity: "3.5d", avgScore: 89 }
];

export const mockSourcePerformance = [
  { source: "Google Maps Discovery", count: 1240, conversionRate: "18.2%", avgScore: 82, quality: "High Yield" },
  { source: "Healthcare Portal Import", count: 340, conversionRate: "22.4%", avgScore: 88, quality: "Prime Niche" },
  { source: "T-Hub / Startup Hubs", count: 280, conversionRate: "24.6%", avgScore: 91, quality: "Enterprise" },
  { source: "Real Estate Expo Lists", count: 320, conversionRate: "14.1%", avgScore: 79, quality: "Moderate" },
  { source: "Direct CSV Ingest", count: 306, conversionRate: "11.5%", avgScore: 68, quality: "Bulk Raw" }
];

// Conversion Funnel Data
export const mockFunnelData = [
  {
    stage: "Raw Discovery",
    count: 2486,
    pct: 100,
    dropPct: 0,
    duration: "Instant",
    color: "#3B82F6",
    desc: "Ingested via Google Maps crawlers & batch CSV files"
  },
  {
    stage: "AI Scored & Qualified",
    count: 1782,
    pct: 71.7,
    dropPct: 28.3,
    duration: "4.2h avg",
    color: "#8B5CF6",
    desc: "Qualified above 60/100 threshold with intent markers"
  },
  {
    stage: "Outreach Dispatched",
    count: 1140,
    pct: 45.9,
    dropPct: 25.8,
    duration: "1.2d avg",
    color: "#FF7A00",
    desc: "Personalized WhatsApp, email & phone introductions"
  },
  {
    stage: "Decision-Maker Reply",
    count: 584,
    pct: 23.5,
    dropPct: 22.4,
    duration: "2.8d avg",
    color: "#EC4899",
    desc: "Active dialogue opened with business owners"
  },
  {
    stage: "Proposal / Demo",
    count: 312,
    pct: 12.6,
    dropPct: 10.9,
    duration: "4.5d avg",
    color: "#F59E0B",
    desc: "Technical scope, quote, and architecture shared"
  },
  {
    stage: "Closed Won Contract",
    count: 148,
    pct: 6.0,
    dropPct: 6.6,
    duration: "6.8d avg",
    color: "#10B981",
    desc: "Signed service agreement across PRCBO verticals"
  }
];

// 3D Depth Pipeline Matrix Data
export const mock3DPipelineData = [
  {
    stage: "Discovery",
    volume: 2486,
    value: "₹82.4L",
    valueNum: 82.4,
    velocity: "1.2d",
    height: 180,
    depthColor: "#3B82F6",
    lightColor: "#60A5FA",
    topColor: "#93C5FD",
    shadowColor: "rgba(59, 130, 246, 0.35)",
    tag: "Top of Funnel"
  },
  {
    stage: "AI Scored",
    volume: 1782,
    value: "₹64.2L",
    valueNum: 64.2,
    velocity: "2.5h",
    height: 145,
    depthColor: "#7C3AED",
    lightColor: "#8B5CF6",
    topColor: "#C4B5FD",
    shadowColor: "rgba(124, 58, 237, 0.35)",
    tag: "High Intent"
  },
  {
    stage: "Outreach",
    volume: 1140,
    value: "₹45.8L",
    valueNum: 45.8,
    velocity: "1.2d",
    height: 115,
    depthColor: "#EA580C",
    lightColor: "#FF7A00",
    topColor: "#FDBA74",
    shadowColor: "rgba(255, 122, 0, 0.35)",
    tag: "Active Pitch"
  },
  {
    stage: "Evaluation",
    volume: 584,
    value: "₹28.6L",
    valueNum: 28.6,
    velocity: "2.8d",
    height: 85,
    depthColor: "#DB2777",
    lightColor: "#EC4899",
    topColor: "#F9A8D4",
    shadowColor: "rgba(236, 72, 153, 0.35)",
    tag: "Demo Stage"
  },
  {
    stage: "Negotiation",
    volume: 312,
    value: "₹19.4L",
    valueNum: 19.4,
    velocity: "4.5d",
    height: 60,
    depthColor: "#D97706",
    lightColor: "#F59E0B",
    topColor: "#FDE68A",
    shadowColor: "rgba(245, 158, 11, 0.35)",
    tag: "Final Terms"
  },
  {
    stage: "Closed Won",
    volume: 148,
    value: "₹12.8L",
    valueNum: 12.8,
    velocity: "6.8d",
    height: 42,
    depthColor: "#059669",
    lightColor: "#10B981",
    topColor: "#6EE7B7",
    shadowColor: "rgba(16, 185, 129, 0.35)",
    tag: "Revenue Booked"
  }
];

export const mockAiInsights = [
  {
    id: "ins-1",
    tag: "High Demand Trend",
    type: "opportunity",
    title: "Web Development Demand Surges in Tier-2 Hubs",
    description: "46% of recently discovered businesses in Madurai and Trichy operate on non-responsive or legacy HTTP websites with critical mobile performance issues.",
    impact: "+32 High-Value Leads",
    action: "Launch Web Revamp Campaign"
  },
  {
    id: "ins-2",
    tag: "Urgent Action Required",
    type: "warning",
    title: "32 Hot Leads Uncontacted (>48 Hours)",
    description: "A cluster of Enterprise Ready manufacturing leads scored above 88/100 have remained in 'New' status without initial outreach.",
    impact: "Risk of Lead Attrition",
    action: "Generate AI Outreach Now"
  },
  {
    id: "ins-3",
    tag: "High Conversion Cluster",
    type: "success",
    title: "IoT Solutions Yield 28% Conversion in Coimbatore & Madurai",
    description: "Cold storage facilities and textile manufacturing units show the fastest response rates when pitched on energy monitoring and telemetry sensors.",
    impact: "₹18L Pipeline Potential",
    action: "View Industrial Cluster Leads"
  },
  {
    id: "ins-4",
    tag: "Channel Optimization",
    type: "info",
    title: "WhatsApp Initial Messaging Yields 3.2x Open Rate Over Cold Email",
    description: "Initial message drafts delivered via WhatsApp Business generated a 68% read rate within 4 hours compared to 21% for conventional cold emails.",
    impact: "Improved Contact Velocity",
    action: "Prioritize WhatsApp Outreach"
  }
];

// Helper to get analytics data adapted to date range
export const getAnalyticsDataByRange = (rangeKey) => {
  switch (rangeKey) {
    case 'today':
      return {
        trend: mockTrendDataToday,
        totalLeads: "96",
        change: "+31.2%",
        conversionRate: "10.4%",
        turnaround: "1.8 hrs",
        dealVolume: "₹4.2L",
        multiplier: 0.15
      };
    case '7days':
      return {
        trend: mockTrendData7Days,
        totalLeads: "784",
        change: "+22.5%",
        conversionRate: "16.8%",
        turnaround: "3.4 hrs",
        dealVolume: "₹24.8L",
        multiplier: 0.4
      };
    case '90days':
      return {
        trend: mockTrendData90Days,
        totalLeads: "6,920",
        change: "+44.1%",
        conversionRate: "18.9%",
        turnaround: "5.1 hrs",
        dealVolume: "₹1.48Cr",
        multiplier: 2.8
      };
    case '30days':
    default:
      return {
        trend: mockTrendData,
        totalLeads: "2,486",
        change: "+18.4%",
        conversionRate: "17.4%",
        turnaround: "4.2 hrs",
        dealVolume: "₹64.2L",
        multiplier: 1.0
      };
  }
};
