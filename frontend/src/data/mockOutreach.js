// Mock Outreach activities, metrics and logs

export const mockOutreachMetrics = {
  totalOutreach: { value: "1,248", change: "+18.4%", positive: true, label: "Total Outreach" },
  sent: { value: "1,120", change: "+12.1%", positive: true, label: "Delivered Messages" },
  opened: { value: "784", change: "+24.5%", positive: true, label: "Opened / Read (70%)" },
  replied: { value: "246", change: "+15.8%", positive: true, label: "Replies & Inquiries (22%)" },
  converted: { value: "68", change: "+9.2%", positive: true, label: "Converted Deals (6%)" }
};

export const mockOutreachLogs = [
  {
    id: "out-501",
    leadId: "lead-101",
    businessName: "Meenakshi Heritage Textiles",
    contactPerson: "Sundarrajan Alagarsamy",
    channel: "Email",
    template: "Industrial IoT Telemetry Modernization",
    status: "Delivered",
    sentAt: "2026-10-04 11:20 AM",
    openStatus: "Opened (3 times)",
    replyStatus: "Pending Reply",
    service: "IoT Solutions",
    agent: "Maneesh V"
  },
  {
    id: "out-502",
    leadId: "lead-102",
    businessName: "Aura Multispeciality Clinic",
    contactPerson: "Dr. K. Radhakrishnan",
    channel: "WhatsApp",
    template: "Direct Booking Engine & Zero Commission",
    status: "Replied",
    sentAt: "2026-10-04 10:15 AM",
    openStatus: "Read 10:18 AM",
    replyStatus: "Requested Demo Video",
    service: "Web Development",
    agent: "Priya S"
  },
  {
    id: "out-503",
    leadId: "lead-103",
    businessName: "Kovai Precision Forge Works",
    contactPerson: "G. Muruganandham",
    channel: "Email",
    template: "Edge AI Surface Defect Inspection",
    status: "Replied",
    sentAt: "2026-10-03 04:45 PM",
    openStatus: "Opened (5 times)",
    replyStatus: "Scheduled Technical Meeting",
    service: "AI Development",
    agent: "Arun K"
  },
  {
    id: "out-504",
    leadId: "lead-104",
    businessName: "Chola Grand Banquet & Suites",
    contactPerson: "Mrs. Revathi Senthil",
    channel: "WhatsApp",
    template: "Hospitality Banquet Lead Acquisition",
    status: "Delivered",
    sentAt: "2026-10-03 02:30 PM",
    openStatus: "Read 02:35 PM",
    replyStatus: "Pending Reply",
    service: "Digital Marketing",
    agent: "Maneesh V"
  },
  {
    id: "out-505",
    leadId: "lead-105",
    businessName: "Namma Bengaluru Cloud Kitchens",
    contactPerson: "Arjun Nambiar",
    channel: "Initial Message",
    template: "D2C Direct WhatsApp Food Ordering",
    status: "Pending",
    sentAt: "Queued for 05:00 PM",
    openStatus: "Unsent",
    replyStatus: "—",
    service: "UI/UX Design",
    agent: "Karthik R"
  },
  {
    id: "out-506",
    leadId: "lead-108",
    businessName: "Apex Global Edutech",
    contactPerson: "Preethi Chandran",
    channel: "Email",
    template: "LMS Phase 2 Rollout & Performance",
    status: "Completed",
    sentAt: "2026-10-01 09:00 AM",
    openStatus: "Opened",
    replyStatus: "Contract Signed",
    service: "Web Development",
    agent: "Maneesh V"
  }
];
