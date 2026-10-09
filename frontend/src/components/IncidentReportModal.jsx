import React, { useState, useEffect } from 'react';
import { generatePDFReport } from '../utils/report';
import { saveEvidenceRecord } from '../services/evidenceStore';

export const INCIDENT_TYPES = [
  'Image Manipulation Investigation',
  'Photo DNA Verification',
  'Photo DNA Registration',
  'Online Harassment',
  'Threatening Comment',
  'Sexual Harassment',
  'Hate / Identity Attack',
  'Personal Information Exposure',
  'Image Ownership / Unauthorized Use',
  'Other'
];

export default function IncidentReportModal({ isOpen, onClose, initialData = {}, onComplete }) {
  if (!isOpen) return null;

  const [incidentType, setIncidentType] = useState(
    initialData.defaultIncidentType || INCIDENT_TYPES[0]
  );
  const [description, setDescription] = useState(initialData.defaultDescription || '');
  const [dateTime, setDateTime] = useState(
    initialData.dateTime || new Date().toISOString().slice(0, 16)
  );
  const [platform, setPlatform] = useState(initialData.platform || 'Online Platform');
  const [relevantUrl, setRelevantUrl] = useState(initialData.relevantUrl || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialData.additionalNotes || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update form if initialData changes
  useEffect(() => {
    if (initialData.defaultIncidentType) setIncidentType(initialData.defaultIncidentType);
    if (initialData.defaultDescription) setDescription(initialData.defaultDescription);
    if (initialData.platform) setPlatform(initialData.platform);
    if (initialData.relevantUrl) setRelevantUrl(initialData.relevantUrl);
    if (initialData.additionalNotes) setAdditionalNotes(initialData.additionalNotes);
  }, [initialData]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const reportPayload = {
        id: initialData.id || `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        incidentType,
        description: description.trim() || 'No description provided by user.',
        dateTime,
        platform,
        relevantUrl,
        additionalNotes,
        evidenceDetails: initialData.evidenceDetails || {},
        sourceModule: initialData.sourceModule || 'Digital Incident Form',
        originalContent: initialData.originalContent || '',
        category: initialData.category || incidentType,
        riskLevel: initialData.riskLevel || 'Medium',
        riskScore: initialData.riskScore !== undefined ? initialData.riskScore : 50,
        reasons: initialData.reasons || [],
        timestamp: new Date(dateTime).toISOString(),
      };

      // 1. Generate downloadable PDF
      generatePDFReport(reportPayload);

      // 2. Save record to Evidence Vault
      const savedRecord = await saveEvidenceRecord({
        id: reportPayload.id,
        incidentType: reportPayload.incidentType,
        title: `Incident Report: ${reportPayload.incidentType}`,
        content: reportPayload.description,
        category: reportPayload.category,
        riskLevel: reportPayload.riskLevel,
        riskScore: reportPayload.riskScore,
        source: reportPayload.platform,
        reasons: reportPayload.reasons,
        notes: `URL: ${reportPayload.relevantUrl || 'N/A'} | Notes: ${reportPayload.additionalNotes || 'None'}`,
        thumbnailUrl: initialData.thumbnailUrl || null,
      });

      if (onComplete) {
        onComplete(savedRecord);
      }
      onClose();
    } catch (err) {
      console.error('Failed to generate incident report:', err);
      setErrorMsg('Failed to generate PDF incident report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-primary text-on-primary p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-fixed text-2xl">description</span>
            <div>
              <h2 className="font-headline-sm text-lg font-semibold leading-tight">Create Incident Report</h2>
              <p className="font-label-sm text-xs text-surface-variant/90">
                ABHEDYA Digital Incident & Evidence Record
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-on-primary hover:text-secondary-fixed transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleGenerateReport} className="p-6 overflow-y-auto flex flex-col gap-4 font-body-sm text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Incident Type Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs text-primary font-semibold uppercase tracking-wider">
              1. Select Incident Type <span className="text-error">*</span>
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            >
              {INCIDENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* What Happened? Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs text-primary font-semibold uppercase tracking-wider">
              2. What Happened? (Incident Description) <span className="text-error">*</span>
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred in your own words (e.g., 'I found this image circulated online and believe it was altered...')"
              className="w-full p-3 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
              required
            />
          </div>

          {/* Date/Time and Platform/Source Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Date & Time of Incident
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full p-2 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                Platform / Source
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. Instagram, YouTube, X, WhatsApp"
                className="w-full p-2 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Relevant URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Relevant URL / Web Link
            </label>
            <input
              type="url"
              value={relevantUrl}
              onChange={(e) => setRelevantUrl(e.target.value)}
              placeholder="https://platform.com/post/12345"
              className="w-full p-2 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Evidence Prefill Summary Box */}
          {initialData.evidenceDetails && (
            <div className="p-3 bg-surface-container rounded-lg border border-surface-variant/70 flex flex-col gap-1">
              <span className="font-label-sm text-[0.6875rem] font-bold text-secondary uppercase tracking-wider">
                Prefilled Evidence Summary
              </span>
              <p className="font-mono text-[0.6875rem] text-on-surface-variant leading-normal">
                {initialData.evidenceDetails.summary || JSON.stringify(initialData.evidenceDetails)}
              </p>
            </div>
          )}

          {/* Additional Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs text-on-surface-variant font-medium uppercase tracking-wider">
              Additional Notes
            </label>
            <textarea
              rows="2"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional context, witness details, or preservation notes..."
              className="w-full p-2.5 bg-surface-container-low text-on-surface rounded-lg border border-surface-variant font-body-sm text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Important Notice in Form */}
          <div className="p-3 bg-surface-container-low rounded-lg border border-surface-variant/50 text-on-surface-variant font-body-sm text-[0.6875rem] leading-relaxed">
            <strong className="text-on-surface">Notice:</strong> This report is a user-generated evidence record intended to help organize and preserve information. It is not an official legal document and does not independently establish authenticity or legal liability.
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-variant/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-title-sm text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary rounded-lg font-title-sm text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>{loading ? 'Generating Report...' : 'Generate & Download Report'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
