import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { 
  getEvidenceRecords, 
  updateEvidenceRecordNotes, 
  deleteEvidenceRecord 
} from '../services/evidenceStore';
import { formatHash } from '../utils/hash';
import { generatePDFReport } from '../utils/report';
import IncidentReportModal from '../components/IncidentReportModal';

export default function EvidenceVaultPage() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editNotes, setEditNotes] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Incident Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  const handleCreateIncidentReport = (rec) => {
    if (rec) {
      let defType = 'Online Harassment';
      if (rec.incidentType === 'Photo Protection') defType = 'Image Ownership / Unauthorized Use';
      else if (rec.incidentType === 'Image Investigation') defType = 'Image Manipulation Investigation';
      else if (rec.category === 'Threat') defType = 'Threatening Comment';
      else if (rec.category === 'Sexual Harassment') defType = 'Sexual Harassment';
      else if (rec.category === 'Hate') defType = 'Hate / Identity Attack';
      else if (rec.category === 'Possible PII') defType = 'Personal Information Exposure';

      setModalInitialData({
        id: rec.id,
        defaultIncidentType: defType,
        defaultDescription: rec.content || rec.title,
        dateTime: rec.timestamp ? new Date(rec.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        platform: rec.source || 'Online Platform',
        sourceModule: rec.incidentType || 'Evidence Vault',
        originalContent: rec.content,
        category: rec.category,
        riskLevel: rec.riskLevel,
        riskScore: rec.riskScore,
        reasons: rec.reasons || [],
        additionalNotes: rec.notes || '',
        thumbnailUrl: rec.thumbnailUrl || null,
      });
    } else {
      setModalInitialData({
        defaultIncidentType: 'Online Harassment',
        defaultDescription: '',
        dateTime: new Date().toISOString().slice(0, 16),
        platform: 'Online Platform',
        sourceModule: 'Evidence Vault',
      });
    }
    setIsReportModalOpen(true);
  };

  // Load records on mount
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    const list = getEvidenceRecords();
    setRecords(list);
  };

  const handleSelectRecord = (rec) => {
    setSelectedRecord(rec);
    setEditNotes(rec.notes || '');
  };

  const handleSaveNotes = () => {
    if (!selectedRecord) return;
    const ok = updateEvidenceRecordNotes(selectedRecord.id, editNotes);
    if (ok) {
      showToast(`Notes updated for record ${selectedRecord.id}`);
      loadRecords();
      setSelectedRecord(prev => prev ? { ...prev, notes: editNotes } : null);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(`Are you sure you want to delete evidence record ${id}?`)) {
      deleteEvidenceRecord(id);
      showToast(`Record ${id} deleted.`);
      setSelectedRecord(null);
      loadRecords();
    }
  };

  const handleExportAllJSON = () => {
    if (records.length === 0) return;
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abhedya_evidence_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Exported all records to JSON');
  };

  const handleExportPDF = (rec) => {
    if (rec) {
      generatePDFReport(rec);
    } else {
      generatePDFReport(records);
    }
    showToast('Generated Incident PDF Report');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Filter logic
  const filteredRecords = records.filter(r => {
    const matchSearch = 
      !searchTerm ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCat = categoryFilter === 'All' || r.category === categoryFilter;
    const matchSev = severityFilter === 'All' || r.riskLevel === severityFilter;
    const matchSrc = sourceFilter === 'All' || r.incidentType === sourceFilter;

    return matchSearch && matchCat && matchSev && matchSrc;
  });

  const categoriesList = Array.from(new Set(records.map(r => r.category))).filter(Boolean);
  const incidentTypesList = Array.from(new Set(records.map(r => r.incidentType))).filter(Boolean);

  const recordsWithNotesCount = records.filter(r => r.notes && r.notes.trim().length > 0).length;

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div class="pl-64">
        <main class="w-full pt-16 bg-surface min-h-screen">
          <div class="max-w-[1440px] mx-auto px-8 py-8 flex flex-col gap-6">

            {/* Header */}
            <div class="w-full flex flex-col gap-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <button 
                    onClick={() => navigate('/workspace')}
                    class="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-body-sm text-xs cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                    <span>Back to workspace</span>
                  </button>
                  <span class="text-outline/60 text-xs">/</span>
                  <span class="font-label-sm text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
                    EVIDENCE REPOSITORY
                  </span>
                </div>
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded border border-surface-variant/70">
                  <span class="w-2 h-2 rounded-full bg-secondary"></span>
                  <span class="font-label-sm text-xs text-on-surface-variant tracking-wide font-medium">
                    Stored Locally ({records.length} Records)
                  </span>
                </div>
              </div>

              <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1 border-b border-surface-variant/40 pb-5">
                <div>
                  <h1 class="font-headline-lg text-3xl md:text-4xl text-primary font-normal tracking-tight">Evidence Vault</h1>
                  <p class="font-body-md text-sm md:text-base text-on-surface-variant mt-1 max-w-3xl">
                    Keep important digital incidents organized, forensically sealed, and ready for review.
                  </p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={handleExportAllJSON}
                    disabled={records.length === 0}
                    class="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-lowest hover:bg-surface-container border border-surface-variant disabled:opacity-50 text-on-surface rounded font-body-sm text-sm font-medium transition-colors shadow-xs cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-base text-secondary">archive</span>
                    <span>Export All (JSON)</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleCreateIncidentReport(null)}
                    class="inline-flex items-center gap-2 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary rounded font-title-sm text-sm font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-base">description</span>
                    <span>Create Incident Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {toastMsg && (
              <div class="p-4 bg-primary text-on-primary rounded-lg flex items-center justify-between shadow-md">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary-fixed-dim">check_circle</span>
                  <span class="font-body-sm text-sm font-medium">{toastMsg}</span>
                </div>
                <button onClick={() => setToastMsg('')} class="text-on-primary">
                  <span class="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            )}

            {/* Preservation Guidance Banner */}
            <div class="w-full bg-surface-container-low border border-surface-variant/70 rounded-lg p-5 shadow-xs relative overflow-hidden">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div class="lg:w-2/5 flex flex-col gap-2">
                  <div class="inline-flex items-center gap-1.5 text-secondary">
                    <span class="material-symbols-outlined text-lg">verified_user</span>
                    <span class="font-label-sm text-xs font-semibold uppercase tracking-wider">Preservation Protocol</span>
                  </div>
                  <h2 class="font-headline-sm text-xl text-primary font-medium tracking-tight">
                    PRESERVE BEFORE YOU REMOVE
                  </h2>
                  <p class="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Before submitting platform reports or deleting content, freeze verified digital copies for your records.
                  </p>
                  <div class="pt-1">
                    <a 
                      href="https://cybercrime.gov.in" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 font-label-sm text-xs text-secondary hover:text-primary transition-colors underline underline-offset-2 font-medium"
                    >
                      <span>Report cybercrime: cybercrime.gov.in</span>
                      <span class="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>
                </div>

                {/* Preservation Checklist */}
                <div class="lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-surface-container-lowest p-4 rounded border border-surface-variant/60 shadow-xs">
                  <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-base text-secondary mt-0.5 shrink-0">check_circle</span>
                    <span class="font-body-sm text-xs text-on-surface">Save complete unedited screenshots with visible URLs</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-base text-secondary mt-0.5 shrink-0">check_circle</span>
                    <span class="font-body-sm text-xs text-on-surface">Keep original raw content & unedited source files</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-base text-secondary mt-0.5 shrink-0">check_circle</span>
                    <span class="font-body-sm text-xs text-on-surface">Record exact timestamps</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-base text-secondary mt-0.5 shrink-0">check_circle</span>
                    <span class="font-body-sm text-xs text-on-surface">Save relevant URLs and account handles</span>
                  </div>
                  <div class="flex items-start gap-2 sm:col-span-2">
                    <span class="material-symbols-outlined text-base text-secondary mt-0.5 shrink-0">check_circle</span>
                    <span class="font-body-sm text-xs text-on-surface">Preserve surrounding conversation & do not delete original before preserving</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div class="w-full bg-surface-container-lowest border border-surface-variant/80 rounded-lg p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
              <div class="relative flex-1 min-w-[240px]">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Record ID, title, keyword or notes..."
                  class="w-full pl-9 pr-3 py-1.5 bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-xs rounded border border-transparent focus:border-surface-variant focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-surface-variant/60 rounded font-label-sm text-xs">
                  <span class="text-on-surface-variant uppercase font-medium">Category:</span>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    class="bg-transparent text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Severity Filter */}
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-surface-variant/60 rounded font-label-sm text-xs">
                  <span class="text-on-surface-variant uppercase font-medium">Severity:</span>
                  <select 
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    class="bg-transparent text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Scores</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Safe">Safe</option>
                  </select>
                </div>

                {/* Module Filter */}
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-surface-variant/60 rounded font-label-sm text-xs">
                  <span class="text-on-surface-variant uppercase font-medium">Module:</span>
                  <select 
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    class="bg-transparent text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Modules</option>
                    {incidentTypesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <span class="font-label-sm text-xs text-on-surface-variant whitespace-nowrap px-1">
                  <strong>{filteredRecords.length} of {records.length}</strong> sealed records
                </span>
              </div>
            </div>

            {/* Evidence Table */}
            <div class="w-full bg-surface-container-lowest border border-surface-variant/80 rounded-lg shadow-xs overflow-hidden">
              {filteredRecords.length === 0 ? (
                <div class="p-12 text-center text-on-surface-variant flex flex-col items-center">
                  <span class="material-symbols-outlined text-4xl text-outline mb-2">folder_off</span>
                  <p class="font-title-sm text-title-sm text-primary font-semibold mb-1">No evidence records saved yet.</p>
                  <p class="font-body-sm text-body-sm max-w-sm">
                    Save records from Photo Protection, Image Investigation, or Comment Safety modules to populate your Evidence Vault.
                  </p>
                </div>
              ) : (
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr class="bg-surface-container-low/90 text-on-surface-variant font-label-sm text-xs uppercase border-b border-surface-variant">
                        <th class="py-3 px-4 font-semibold w-[28%]">Record ID & Title</th>
                        <th class="py-3 px-4 font-semibold w-[18%]">Category & Target</th>
                        <th class="py-3 px-4 font-semibold w-[14%]">Risk Severity</th>
                        <th class="py-3 px-4 font-semibold w-[22%]">Saved Timestamp & Fingerprint</th>
                        <th class="py-3 px-4 font-semibold w-[18%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-variant/60 font-body-sm text-xs">
                      {filteredRecords.map((rec) => {
                        let dotBg = "bg-secondary";
                        if (rec.riskLevel === 'Critical') dotBg = "bg-error";
                        else if (rec.riskLevel === 'High') dotBg = "bg-tertiary-fixed-dim";
                        else if (rec.riskLevel === 'Safe') dotBg = "bg-emerald-600";

                        return (
                          <tr 
                            key={rec.id}
                            onClick={() => handleSelectRecord(rec)}
                            class={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                              selectedRecord?.id === rec.id ? 'bg-surface-container-low' : ''
                            }`}
                          >
                            <td class="py-3.5 px-4">
                              <div class="flex items-start gap-2.5">
                                <div class={`w-2 h-2 rounded-full ${dotBg} mt-1.5 shrink-0`}></div>
                                <div class="flex flex-col min-w-0">
                                  <div class="flex items-center gap-2">
                                    <span class="font-label-md text-xs font-semibold text-primary font-mono">{rec.id}</span>
                                    <span class="px-1.5 py-0.2 bg-surface-container text-on-surface-variant rounded text-[0.625rem] font-label-sm uppercase font-semibold">
                                      {rec.incidentType}
                                    </span>
                                  </div>
                                  <span class="font-title-sm text-xs font-semibold text-on-surface mt-0.5">{rec.title}</span>
                                  <span class="font-body-sm text-xs text-on-surface-variant italic truncate max-w-sm mt-0.5">
                                    {rec.content}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td class="py-3.5 px-4">
                              <div class="flex flex-col gap-0.5">
                                <span class="font-label-sm text-xs text-primary font-semibold">{rec.category}</span>
                                <span class="font-label-sm text-[0.6875rem] text-on-surface-variant">Source: {rec.source}</span>
                              </div>
                            </td>

                            <td class="py-3.5 px-4">
                              <div class="flex flex-col gap-1 w-28">
                                <div class="flex items-center justify-between">
                                  <span class="font-label-md text-xs font-bold text-primary">{rec.riskLevel}</span>
                                  <span class="font-label-sm text-[0.625rem] font-mono text-outline">{rec.riskScore !== null ? `${rec.riskScore}/100` : ''}</span>
                                </div>
                                <div class="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                  <div 
                                    class={`h-full rounded-full ${rec.riskLevel === 'Critical' ? 'bg-error' : 'bg-secondary'}`}
                                    style={{ width: `${rec.riskScore !== null ? rec.riskScore : 50}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            <td class="py-3.5 px-4">
                              <div class="flex flex-col gap-1">
                                <span class="font-label-sm text-[0.6875rem] font-mono text-on-surface bg-surface-container px-1.5 py-0.5 rounded w-fit">
                                  {formatHash(rec.sha256)}
                                </span>
                                <span class="font-label-sm text-[0.6875rem] text-on-surface-variant">
                                  {rec.timestamp ? new Date(rec.timestamp).toLocaleString() : ''}
                                </span>
                              </div>
                            </td>

                            <td class="py-3.5 px-4 whitespace-nowrap text-right">
                              <div class="inline-flex items-center gap-1.5 justify-end">
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSelectRecord(rec); }}
                                  class="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-sm text-xs font-medium transition-colors"
                                >
                                  View
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCreateIncidentReport(rec); }}
                                  class="px-2 py-1 bg-primary-container hover:bg-primary text-on-primary rounded font-label-sm text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Create Report
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }}
                                  class="p-1 text-on-surface-variant hover:text-error hover:bg-surface-container rounded transition-colors"
                                  title="Delete Record"
                                >
                                  <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Record Detail & Notes Modal / Panel */}
            {selectedRecord && (
              <div class="bg-surface-container-lowest border border-primary/20 rounded-lg p-5 shadow-md flex flex-col gap-4">
                <div class="flex items-center justify-between border-b border-surface-variant pb-3">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-xl">dossier</span>
                    <div>
                      <h3 class="font-title-sm text-base text-primary font-semibold">
                        Record Detail: {selectedRecord.id}
                      </h3>
                      <span class="font-label-sm text-xs text-on-surface-variant">
                        {selectedRecord.title}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} class="text-on-surface-variant hover:text-primary">
                    <span class="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body-sm">
                  <div class="flex flex-col gap-2 bg-surface-container-low p-3 rounded border border-surface-variant/60">
                    <div>
                      <strong class="text-primary font-label-sm block uppercase">Content Payload:</strong>
                      <p class="text-on-surface mt-1 whitespace-pre-wrap">{selectedRecord.content}</p>
                    </div>

                    <div class="pt-2 border-t border-surface-variant/40">
                      <strong class="text-primary font-label-sm block uppercase">SHA-256 Fingerprint:</strong>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="font-mono text-on-surface bg-surface-container p-1.5 rounded select-all break-all">
                          {selectedRecord.sha256}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedRecord.sha256);
                            showToast('SHA-256 Fingerprint copied');
                          }}
                          class="p-1 text-secondary hover:text-primary"
                          title="Copy Fingerprint"
                        >
                          <span class="material-symbols-outlined text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="font-label-sm text-xs text-primary font-semibold uppercase" htmlFor="notes-editor">
                      User Notes & Context (Editable):
                    </label>
                    <textarea 
                      id="notes-editor"
                      rows="5"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      class="w-full p-3 bg-surface-container-low text-on-surface rounded border border-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                      placeholder="Add personal notes, case context, or follow-up details..."
                    />
                    <div class="flex items-center justify-between pt-1">
                      <button 
                        type="button"
                        onClick={handleSaveNotes}
                        class="px-4 py-1.5 bg-primary text-on-primary rounded font-title-sm text-xs font-medium cursor-pointer hover:bg-primary-container"
                      >
                        Save Notes
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(selectedRecord.id)}
                        class="px-3 py-1.5 bg-error-container text-on-error-container rounded font-title-sm text-xs font-medium cursor-pointer hover:bg-error/20"
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Verification & Report Readiness Cards */}
            <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
              
              {/* SHA-256 Fingerprint Explanation Card */}
              <div class="lg:col-span-7 bg-surface-container-lowest border border-surface-variant/80 p-5 rounded-lg shadow-xs flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between pb-3 border-b border-surface-variant/40 mb-3">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-secondary text-base">fingerprint</span>
                      <h3 class="font-title-sm text-sm text-primary font-semibold">Browser Fingerprint Verification</h3>
                    </div>
                  </div>
                  
                  <p class="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    SHA-256 fingerprint of this record, computed in your browser when saved. It helps you notice later changes. It is not a legal certification.
                  </p>
                </div>

                <div class="flex items-center gap-2 mt-4 text-on-surface-variant font-label-sm text-[0.6875rem]">
                  <span class="material-symbols-outlined text-sm text-secondary">verified</span>
                  <span>Computed via Web Crypto API (SHA-256 standard)</span>
                </div>
              </div>

              {/* Report Readiness Card */}
              <div class="lg:col-span-5 bg-primary text-on-primary p-5 rounded-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div class="relative z-10">
                  <div class="flex items-center justify-between pb-3 border-b border-on-primary/10 mb-3">
                    <span class="font-label-sm text-[0.6875rem] uppercase text-secondary-fixed tracking-wider font-semibold">Incident Documentation</span>
                    <span class="material-symbols-outlined text-secondary-fixed text-lg">description</span>
                  </div>
                  <h3 class="font-headline-sm text-lg text-on-primary font-medium tracking-tight">Report Readiness</h3>
                  <p class="font-body-sm text-xs text-surface-variant/90 mt-2 leading-relaxed">
                    {records.length} evidence record{records.length === 1 ? '' : 's'} stored locally. {recordsWithNotesCount} record{recordsWithNotesCount === 1 ? '' : 's'} annotated with user notes.
                  </p>
                </div>

                <div class="relative z-10 mt-5 pt-3 border-t border-on-primary/15 flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={() => handleCreateIncidentReport(null)}
                    class="w-full py-2.5 px-4 bg-secondary hover:bg-secondary/90 text-on-secondary rounded font-title-sm text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-base">download_for_offline</span>
                    <span>Create Incident Report</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>

      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialData={modalInitialData}
        onComplete={() => {
          loadRecords();
          showToast('Incident Report created & saved to Evidence Vault');
        }}
      />
    </div>
  );
}
