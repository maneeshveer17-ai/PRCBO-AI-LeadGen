// Mock data for Data Imports history and pipelines

export const mockImportHistory = [
  {
    id: "imp-1092",
    fileName: "madurai_manufacturing_sidco_q3.csv",
    fileSize: "2.4 MB",
    records: 480,
    valid: 462,
    duplicates: 14,
    errors: 4,
    status: "Completed",
    importedBy: "Maneesh V (Admin)",
    date: "2026-10-04 14:32",
    sourceType: "CSV Upload"
  },
  {
    id: "imp-1091",
    fileName: "chennai_healthcare_clinics_places.xlsx",
    fileSize: "4.8 MB",
    records: 850,
    valid: 812,
    duplicates: 28,
    errors: 10,
    status: "Completed",
    importedBy: "Priya S (Data Lead)",
    date: "2026-10-03 18:15",
    sourceType: "Excel Spreadsheet"
  },
  {
    id: "imp-1090",
    fileName: "coimbatore_textile_exporters_sync.json",
    fileSize: "1.2 MB",
    records: 310,
    valid: 295,
    duplicates: 12,
    errors: 3,
    status: "Completed",
    importedBy: "Arun K (AI Eng)",
    date: "2026-10-02 11:20",
    sourceType: "API Webhook"
  },
  {
    id: "imp-1089",
    fileName: "bengaluru_cloud_kitchen_registry.csv",
    fileSize: "8.1 MB",
    records: 1240,
    valid: 1190,
    duplicates: 42,
    errors: 8,
    status: "Completed",
    importedBy: "Maneesh V (Admin)",
    date: "2026-10-01 09:45",
    sourceType: "CSV Upload"
  },
  {
    id: "imp-1088",
    fileName: "hyderabad_fintech_startups_unverified.csv",
    fileSize: "3.5 MB",
    records: 220,
    valid: 0,
    duplicates: 0,
    errors: 220,
    status: "Failed",
    importedBy: "Karthik R (Dev)",
    date: "2026-09-30 16:10",
    sourceType: "CSV Upload",
    failureReason: "Missing mandatory 'contact_phone' and 'business_category' header columns."
  }
];
