import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Database,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';

export const DataImports = () => {
  const { addToast, addLead, leads } = useLeads();

  const [history, setHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const normalize = (value) =>
    String(value ?? '').trim().toLowerCase();

  const getValue = (row, aliases) => {
    const normalizedAliases = aliases.map((alias) =>
      alias.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const key = Object.keys(row).find((item) =>
      normalizedAliases.includes(
        item.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    );

    return key ? String(row[key] ?? '').trim() : '';
  };

  const downloadTemplate = () => {
    const template = [
      [
        'business_name',
        'category',
        'location',
        'email',
        'phone',
        'website'
      ],
      [
        'Example Business',
        'Manufacturing',
        'Madurai, Tamil Nadu',
        'contact@example.com',
        '9876543210',
        'https://example.com'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Business Leads'
    );

    XLSX.writeFile(workbook, 'PRCBO_Lead_Import_Template.csv', {
      bookType: 'csv'
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      addToast('File size must not exceed 25 MB.', 'error');
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (!['csv', 'xlsx', 'xls', 'json'].includes(extension)) {
      addToast('Please upload a CSV, Excel, or JSON file.', 'error');
      return;
    }

    setIsUploading(true);

    let rows = [];
    let valid = 0;
    let duplicates = 0;
    let errors = 0;

    try {
      if (extension === 'json') {
        const parsed = JSON.parse(await file.text());

        rows = Array.isArray(parsed)
          ? parsed
          : parsed.data;

        if (!Array.isArray(rows)) {
          throw new Error(
            'JSON must contain an array of business records.'
          );
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        rows = XLSX.utils.sheet_to_json(firstSheet, {
          defval: '',
          raw: false
        });
      }

      if (rows.length === 0) {
        throw new Error('The selected file contains no records.');
      }

      const seen = new Set();

      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          errors++;
          continue;
        }

        const businessName = getValue(row, [
          'business_name',
          'businessName',
          'business',
          'company_name',
          'company',
          'name'
        ]);

        const location =
          getValue(row, ['location', 'city', 'address']) || 'India';

        const email = getValue(row, [
          'email',
          'email_address',
          'emailAddress'
        ]);

        const phone = getValue(row, [
          'phone',
          'phone_number',
          'mobile',
          'mobile_number'
        ]);

        const website = getValue(row, [
          'website',
          'web_site',
          'url'
        ]);

        const category =
          getValue(row, ['category', 'industry', 'business_type']) ||
          'Commercial';

        if (!businessName) {
          errors++;
          continue;
        }

        if (
          email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          errors++;
          continue;
        }

        const duplicateKey =
          `${normalize(businessName)}|${normalize(location)}`;

        const alreadyExists = (leads || []).some(
          (lead) =>
            normalize(lead.businessName ?? lead.business_name) ===
              normalize(businessName) &&
            normalize(lead.location) === normalize(location)
        );

        if (seen.has(duplicateKey) || alreadyExists) {
          duplicates++;
          continue;
        }

        seen.add(duplicateKey);

        try {
          const saved = await addLead({
            businessName,
            category,
            location,
            email,
            phone,
            website,
            source:
              extension === 'csv'
                ? 'CSV Import'
                : extension === 'json'
                  ? 'JSON Import'
                  : 'Excel Import',
            isRealData: true
          });

          if (saved) {
            valid++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      const entry = {
        id: `imp-${Date.now()}`,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        records: rows.length,
        valid,
        duplicates,
        errors,
        status: errors > 0 && valid === 0 ? 'Failed' : 'Completed',
        importedBy: 'Current User',
        date: new Date().toLocaleString(),
        sourceType: `${extension.toUpperCase()} Upload`
      };

      setHistory((previous) => [entry, ...previous]);

      addToast(
        `Import finished: ${valid} saved, ${duplicates} duplicates skipped, ${errors} errors.`,
        valid > 0 ? 'success' : 'info'
      );
    } catch (error) {
      addToast(
        error.message || 'Unable to process the selected file.',
        'error'
      );
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            Data Imports & Collection
          </h1>
          <p className="page-header-subtitle">
            Upload, validate, deduplicate and import business leads.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={downloadTemplate}
          >
            <Download size={15} /> Download CSV Template
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ padding: '2rem', marginBottom: '2rem' }}
      >
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
          Import Your Leads
        </h3>

        <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>
          Upload business records in CSV, Excel or JSON format.
          Records are validated before being sent to Supabase.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          hidden
          onChange={(event) =>
            handleFileUpload(event.target.files?.[0])
          }
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);

            if (!isUploading) {
              handleFileUpload(event.dataTransfer.files?.[0]);
            }
          }}
          style={{
            border: isDragging
              ? '2px dashed var(--color-primary)'
              : '2px dashed var(--color-slate-300)',
            backgroundColor: isDragging
              ? 'var(--color-primary-light)'
              : 'var(--color-slate-50)',
            borderRadius: '12px',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            cursor: isUploading ? 'wait' : 'pointer'
          }}
          onClick={() => {
            if (!isUploading) {
              fileInputRef.current?.click();
            }
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <UploadCloud size={32} />
          </div>

          <h4 style={{ marginBottom: '0.5rem' }}>
            {isUploading
              ? 'Validating and importing records...'
              : 'Drag and drop files here, or browse'}
          </h4>

          <p style={{ marginBottom: '1.5rem' }}>
            Supported: CSV, XLSX, XLS and JSON. Maximum size: 25 MB.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={isUploading}
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? 'Importing...' : 'Choose File to Upload'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem'
          }}
        >
          <div>
            <FileText size={20} />
            <strong> CSV Spreadsheet</strong>
          </div>

          <div>
            <FileSpreadsheet size={20} />
            <strong> Excel Spreadsheet</strong>
          </div>

          <div>
            <Database size={20} />
            <strong> JSON Data</strong>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <h3>Import History</h3>
          <p>Results from uploads in this session.</p>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name & Size</th>
                <th>Records</th>
                <th>Valid</th>
                <th>Duplicates</th>
                <th>Errors</th>
                <th>Status</th>
                <th>Imported By</th>
                <th>Date & Time</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    No files imported in this session yet.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileSpreadsheet size={15} />
                        {item.fileName}
                      </div>
                      <small>
                        {item.fileSize} · {item.sourceType}
                      </small>
                    </td>

                    <td>{item.records}</td>
                    <td>
                      <span style={{ color: '#10B981' }}>
                        <CheckCircle2 size={14} /> {item.valid}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#F59E0B' }}>
                        <AlertTriangle size={14} /> {item.duplicates}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#EF4444' }}>
                        <XCircle size={14} /> {item.errors}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          item.status === 'Completed'
                            ? 'badge badge-converted'
                            : 'badge badge-rejected'
                     }
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.importedBy}</td>
                    <td>{item.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataImports;