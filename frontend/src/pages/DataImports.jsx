import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import { mockImportHistory } from '../data/mockImports';

export const DataImports = () => {
  const { addToast } = useLeads();
  const [history, setHistory] = useState(mockImportHistory);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSimulateUpload = (fileName) => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const newEntry = {
        id: `imp-${Date.now()}`,
        fileName: fileName || "madurai_hospitals_batch_oct.csv",
        fileSize: "3.2 MB",
        records: 520,
        valid: 504,
        duplicates: 12,
        errors: 4,
        status: "Completed",
        importedBy: "Maneesh V (Admin)",
        date: "Just now",
        sourceType: "CSV Upload"
      };
      setHistory([newEntry, ...history]);
      addToast(`Successfully imported 504 valid records from ${newEntry.fileName}!`, 'success');
    }, 1200);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Data Imports & Collection</h1>
          <p className="page-header-subtitle">
            Upload B2B datasets, run automated schema normalization, deduplicate contacts and ingest into Supabase.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => addToast("Downloading PRCBO standard B2B import template CSV...", "info")}
          >
            <Download size={15} /> Download CSV Template
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Container */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
          Import Your Leads
        </h3>
        <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>
          Our AI pipeline automatically cleanses records, matches Tamil Nadu PIN codes, and detects duplicate GSTIN/phone numbers.
        </p>

        {/* Drag Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleSimulateUpload(e.dataTransfer.files[0]?.name);
          }}
          style={{
            border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--color-slate-300)',
            backgroundColor: isDragging ? 'var(--color-primary-light)' : 'var(--color-slate-50)',
            borderRadius: '12px',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleSimulateUpload("coimbatore_manufacturing_leads.csv")}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <UploadCloud size={32} />
          </div>

          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.35rem' }}>
            {isUploading ? 'Validating & Normalizing Schema...' : 'Drag and drop lead files here, or browse'}
          </h4>

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Supported formats: <strong>.CSV</strong>, <strong>.XLSX (Excel)</strong>, or <strong>JSON payload</strong>. Max file size: 25 MB per ingestion batch.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={isUploading}
            style={{ pointerEvents: 'none' }}
          >
            {isUploading ? 'Parsing Records...' : 'Choose File to Upload'}
          </button>
        </div>

        {/* Format Compatibility Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}>
            <FileText size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>CSV Spreadsheet</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)' }}>UTF-8 formatted comma separated</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}>
            <FileSpreadsheet size={20} style={{ color: '#10B981' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Microsoft Excel (.xlsx)</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)' }}>Multi-sheet support with auto-merge</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)' }}>
            <Database size={20} style={{ color: '#8B5CF6' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>API Webhook Source</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)' }}>REST endpoint integration ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Import History Table */}
      <div className="table-container">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
              Ingestion History & Validation Logs
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
              Detailed audit trail of all historical lead batches and validation integrity
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name & Size</th>
                <th>Records Ingested</th>
                <th>Valid</th>
                <th>Duplicates</th>
                <th>Errors</th>
                <th>Status</th>
                <th>Imported By</th>
                <th>Date & Time</th>
                <th style={{ textAlign: 'right' }}>Log</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileSpreadsheet size={15} style={{ color: 'var(--color-primary)' }} />
                      {item.fileName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '2px' }}>
                      {item.fileSize} &bull; {item.sourceType}
                    </div>
                  </td>

                  <td>
                    <strong style={{ color: 'var(--color-slate-900)' }}>{item.records}</strong>
                  </td>

                  <td>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>{item.valid}</span>
                  </td>

                  <td>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>{item.duplicates}</span>
                  </td>

                  <td>
                    <span style={{ color: item.errors > 0 ? '#EF4444' : 'var(--color-slate-400)', fontWeight: 600 }}>
                      {item.errors}
                    </span>
                  </td>

                  <td>
                    {item.status === 'Completed' && (
                      <span className="badge badge-converted">Completed</span>
                    )}
                    {item.status === 'Processing' && (
                      <span className="badge badge-followup">Processing</span>
                    )}
                    {item.status === 'Failed' && (
                      <span className="badge badge-rejected">Failed</span>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-700)' }}>
                      {item.importedBy}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {item.date}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => addToast(`Viewing execution logs for batch ${item.id}`, "info")}
                    >
                      Audit Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataImports;
