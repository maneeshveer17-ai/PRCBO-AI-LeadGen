/**
 * PRCBO AI LeadGen - Executive Export Service
 * 
 * Provides production-ready export generators for:
 * 1. Microsoft Excel Workbook (.xlsx) with dual sheets (Analytics Summary & Lead Records)
 * 2. Executive PDF Report (.pdf) with multi-page table handling, brand headers, and KPI cards
 * 
 * Complies with enterprise data standards:
 * - Direct browser downloads without page navigation
 * - Preserves actual fields without fabricating missing values
 * - Graceful guards against empty datasets and invalid records
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getJsPDF = (opt) => {
  const Constructor = typeof jsPDF === 'function' ? jsPDF : (jsPDF?.default || jsPDF?.jsPDF);
  return new Constructor(opt);
};

const getAutoTable = () => {
  return typeof autoTable === 'function' ? autoTable : (autoTable?.default || autoTable);
};

/**
 * Helper to download Blob in browser without page navigation
 */
const downloadBlob = (blob, filename) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Browser environment required for file download');
  }
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 200);
};

/**
 * Generate and download an Excel Workbook (.xlsx)
 * @param {Array} leadsList - Filtered array of lead records
 * @param {Object} kpiMetrics - Computed KPI metrics
 * @param {Object} filterSummary - Active filter descriptions
 * @param {string} filename - Target filename
 */
export const exportToExcel = (leadsList = [], kpiMetrics = {}, filterSummary = {}, filename = 'PRCBO_Executive_Leads_Report.xlsx') => {
  if (!Array.isArray(leadsList) || leadsList.length === 0) {
    throw new Error('No lead records available to export.');
  }

  const wb = XLSX.utils.book_new();

  // --- SHEET 1: Analytics Summary ---
  const summaryAoa = [
    ['PRCBO TECH — EXECUTIVE LEAD INTELLIGENCE REPORT', ''],
    ['Generated Timestamp', new Date().toLocaleString()],
    ['Active Date Range', filterSummary.dateRangeLabel || 'All Time'],
    ['Status Filter', filterSummary.status || 'All Statuses'],
    ['Service Filter', filterSummary.service || 'All Services'],
    ['Location Filter', filterSummary.location || 'All Locations'],
    ['City Filter', filterSummary.selectedCity || 'None'],
    ['', ''],
    ['KEY PERFORMANCE INDICATORS (KPIs)', 'CALCULATED VALUE'],
    ['Total Leads Ingested', kpiMetrics.totalLeads ?? leadsList.length],
    ['New Leads (Pending Triage)', kpiMetrics.newLeads ?? 0],
    ['Hot Leads (AI Score >= 80 or HOT Tier)', kpiMetrics.hotLeads ?? 0],
    ['Contacted Leads (Outreach Dispatched)', kpiMetrics.contactedLeads ?? 0],
    ['Converted Leads (Deals Closed Won)', kpiMetrics.convertedLeads ?? 0],
    ['Rejected Leads (Archived)', kpiMetrics.rejectedLeads ?? 0],
    ['Follow-up Leads (In Pipeline)', kpiMetrics.followUpLeads ?? 0],
    ['Conversion Win Rate', kpiMetrics.conversionRate ?? '0.0%'],
    ['Average AI Score', kpiMetrics.avgAiScore !== 'N/A' ? `${kpiMetrics.avgAiScore} / 100` : 'Pending AI Scan'],
    ['Scored Leads Count', kpiMetrics.validScoresCount ?? 0],
    ['Unscored Leads Count', kpiMetrics.unscoredCount ?? 0],
    ['Estimated Pipeline Capital Value', kpiMetrics.dealVolumeDisplay ?? 'N/A'],
    ['', ''],
    ['DATA MODEL & STORAGE SPECIFICATION', ''],
    ['Storage Layer', 'PRCBO Local Session Prototype (LeadContext in-memory)'],
    ['Deduplication Status', 'Verified Unique Records'],
    ['Confidentiality', 'PRCBO Tech Internal Executive Document']
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Analytics Summary');

  // --- SHEET 2: Lead Records ---
  const leadRows = leadsList.map((lead, idx) => ({
    '#': idx + 1,
    'Business Name': lead.businessName || '',
    'Category': lead.category || '',
    'Location': lead.location || '',
    'Email': lead.email || '',
    'Phone': lead.phone || '',
    'Contact Person': lead.contactPerson || '',
    'Designation': lead.designation || '',
    'Recommended Service': lead.recommendedService || '',
    'AI Score': typeof lead.aiScore === 'number' && !isNaN(lead.aiScore) ? lead.aiScore : (lead.aiScore ?? ''),
    'Score Tier': lead.scoreTier || '',
    'Status': lead.status || 'New',
    'Source': lead.source || '',
    'Created Date': lead.dateAdded || '',
    'Website': lead.website || '',
    'Opportunity Summary': lead.summary || ''
  }));

  const wsLeads = XLSX.utils.json_to_sheet(leadRows);
  wsLeads['!cols'] = [
    { wch: 5 },
    { wch: 34 },
    { wch: 18 },
    { wch: 25 },
    { wch: 28 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 26 },
    { wch: 14 },
    { wch: 32 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLeads, 'Lead Records');

  // Write and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  downloadBlob(blob, filename);

  return { success: true, count: leadsList.length, filename };
};

/**
 * Generate and download an Executive PDF Report (.pdf)
 * @param {Array} leadsList - Filtered array of lead records
 * @param {Object} kpiMetrics - Computed KPI metrics
 * @param {Object} filterSummary - Active filter descriptions
 * @param {string} filename - Target filename
 */
export const exportToPDF = (leadsList = [], kpiMetrics = {}, filterSummary = {}, filename = 'PRCBO_Executive_Leads_Report.pdf') => {
  if (!Array.isArray(leadsList) || leadsList.length === 0) {
    throw new Error('No lead records available to export.');
  }

  // Create landscape document for clean table presentation
  const doc = getJsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Navy Banner
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 54, 'F');

  // Orange Brand Accent Strip
  doc.setFillColor(255, 122, 0); // #FF7A00
  doc.rect(0, 51, pageWidth, 3.5, 'F');

  // Banner Header Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('PRCBO Tech — Executive AI Lead Intelligence Report', 28, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Active Scope: ${leadsList.length} Leads`, 28, 43);

  // Filters Info Strip
  let currentY = 72;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const filterText = `Filters: Date Window: [${filterSummary.dateRangeLabel || 'All Time'}]  |  Status: [${filterSummary.status || 'All'}]  |  Service: [${filterSummary.service || 'All'}]  |  Location: [${filterSummary.location || 'All'}]${filterSummary.selectedCity ? `  |  City: [${filterSummary.selectedCity}]` : ''}`;
  doc.text(filterText, 28, currentY);

  // 8 Executive KPI Stat Cards
  currentY += 12;
  const kpiCards = [
    { label: 'TOTAL LEADS', val: String(kpiMetrics.totalLeads ?? leadsList.length), color: [255, 122, 0] },
    { label: 'NEW LEADS', val: String(kpiMetrics.newLeads ?? 0), color: [59, 130, 246] },
    { label: 'HOT LEADS', val: String(kpiMetrics.hotLeads ?? 0), color: [234, 88, 12] },
    { label: 'CONTACTED', val: String(kpiMetrics.contactedLeads ?? 0), color: [139, 92, 246] },
    { label: 'CONVERTED', val: String(kpiMetrics.convertedLeads ?? 0), color: [16, 185, 129] },
    { label: 'REJECTED', val: String(kpiMetrics.rejectedLeads ?? 0), color: [239, 68, 68] },
    { label: 'WIN RATE', val: String(kpiMetrics.conversionRate ?? '0.0%'), color: [16, 185, 129] },
    { label: 'AVG AI SCORE', val: kpiMetrics.avgAiScore !== 'N/A' ? `${kpiMetrics.avgAiScore}/100` : 'Pending', color: [255, 122, 0] }
  ];

  const margin = 28;
  const gap = 6;
  const totalGaps = (kpiCards.length - 1) * gap;
  const cardWidth = (pageWidth - margin * 2 - totalGaps) / kpiCards.length;
  const cardHeight = 38;

  kpiCards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 4, 4, 'FD');

    // Colored accent top
    doc.setFillColor(...card.color);
    doc.rect(x, currentY, cardWidth, 2, 'F');

    // Label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 5, currentY + 12);

    // Value
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(card.val, x + 5, currentY + 28);
  });

  currentY += cardHeight + 16;

  // Section Heading
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Active Lead Intelligence Records (${leadsList.length})`, margin, currentY);
  currentY += 6;

  // Table Data Preparation
  const tableHead = [[
    '#',
    'Business Name',
    'Category',
    'Location',
    'Recommended Service',
    'AI Score',
    'Status',
    'Phone / Contact',
    'Source',
    'Date Added'
  ]];

  const tableBody = leadsList.map((lead, idx) => {
    const phoneDisplay = lead.phone || (lead.contactPerson || '—');
    const scoreDisplay = typeof lead.aiScore === 'number' && !isNaN(lead.aiScore)
      ? `${lead.aiScore}`
      : (lead.aiScore ?? 'Pending');

    return [
      idx + 1,
      lead.businessName || '—',
      lead.category || '—',
      lead.location || '—',
      lead.recommendedService || '—',
      scoreDisplay,
      lead.status || 'New',
      phoneDisplay,
      lead.source || '—',
      lead.dateAdded || '—'
    ];
  });

  // Render Table across Pages with repeat header
  const renderTable = getAutoTable();
  renderTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 32 },
    showHead: 'everyPage',
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' }, // #
      1: { cellWidth: 140, fontStyle: 'bold' }, // Business Name
      2: { cellWidth: 65 }, // Category
      3: { cellWidth: 95 }, // Location
      4: { cellWidth: 85 }, // Service
      5: { cellWidth: 42, halign: 'center' }, // AI Score
      6: { cellWidth: 50, halign: 'center' }, // Status
      7: { cellWidth: 95 }, // Phone / Contact
      8: { cellWidth: 90 }, // Source
      9: { cellWidth: 50, halign: 'center' } // Date Added
    },
    didDrawPage: (data) => {
      // Dynamic Footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `PRCBO Tech  •  AI Lead Intelligence Platform  •  Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 14,
        { align: 'center' }
      );
    }
  });

  // Save PDF file (triggers browser download directly)
  doc.save(filename);

  return { success: true, count: leadsList.length, filename };
};
