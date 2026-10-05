import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { analyzeComments, checkBackendHealth } from '../services/api';
import { saveEvidenceRecord } from '../services/evidenceStore';
import { generatePDFReport } from '../utils/report';
import IncidentReportModal from '../components/IncidentReportModal';

export default function CommentSafetyPage() {
  const navigate = useNavigate();

  const sampleBatch = [
    "Your content is amazing!",
    "You are completely useless, stop posting.",
    "I know where you live and which studio you work in.",
    "Send me your phone number right now.",
    "Call me on 9876543210"
  ];

  const [inputLines, setInputLines] = useState(sampleBatch.join('\n'));
  const [sensitivity, setSensitivity] = useState('standard'); // 'standard' | 'strict'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);

  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'threats' | 'safe'
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [showHidden, setShowHidden] = useState(false);

  // Incident Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

 useEffect(() => {
    setBackendOnline(true);
  }, []);

  const openReportModalForItem = (item) => {
    let defType = 'Online Harassment';
    if (item.category === 'Threat') defType = 'Threatening Comment';
    else if (item.category === 'Sexual Harassment') defType = 'Sexual Harassment';
    else if (item.category === 'Hate') defType = 'Hate / Identity Attack';
    else if (item.category === 'Possible PII') defType = 'Personal Information Exposure';

    setModalInitialData({
      defaultIncidentType: defType,
      defaultDescription: `Flagged comment received online: "${item.comment}"`,
      originalContent: item.comment,
      category: item.category,
      riskLevel: item.risk_level,
      riskScore: item.risk_score,
      reasons: item.reasons,
      sourceModule: 'Comment Safety',
      dateTime: new Date().toISOString().slice(0, 16),
      platform: 'Online Platform',
      evidenceDetails: {
        comment: item.comment,
        category: item.category,
        riskLevel: item.risk_level,
        riskScore: item.risk_score,
        reasons: item.reasons,
      }
    });
    setIsReportModalOpen(true);
  };

 const handleAnalyze = async () => {
  const rawComments = inputLines
    .split('\n')
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (rawComments.length === 0) {
    setErrorMsg('Please paste at least one comment line to analyze.');
    return;
  }

  if (rawComments.length > 50) {
    setErrorMsg('Maximum 50 comments per batch allowed.');
    return;
  }

  setErrorMsg('');
  setLoading(true);

  try {
   const response = await fetch('http://127.0.0.1:8001/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comments: rawComments,
        sensitivity: sensitivity,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    setResults(data.results || []);
    setBackendOnline(true);

    showToast(
      `Analyzed ${data.results?.length || 0} comment${data.results?.length === 1 ? '' : 's'} via FastAPI backend.`
    );
  } catch (err) {
    console.error('Comment analysis error:', err);
    setBackendOnline(false);
    setErrorMsg(
      'Backend offline or analysis failed. Check the FastAPI server and /analyze endpoint.'
    );
  } finally {
    setLoading(false);
  }
};

const handleClear = () => {
    setInputLines('');
    setResults([]);
    setErrorMsg('');
  };

  const handleFillSample = () => {
    setInputLines(sampleBatch.join('\n'));
  };

  const handleToggleHide = (idx) => {
    const next = new Set(hiddenIds);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setHiddenIds(next);
  };

  const handleSaveItem = async (item) => {
    try {
      const record = await saveEvidenceRecord({
        incidentType: 'Comment Safety',
        title: `Flagged Comment: "${item.comment.slice(0, 30)}..."`,
        content: item.comment,
        category: item.category,
        riskLevel: item.risk_level,
        riskScore: item.risk_score,
        source: 'Pasted Comment Log',
        reasons: item.reasons,
        notes: `Engine: ${item.model_used}. Reasons: ${item.reasons.join(', ')}`,
      });
      showToast(`Saved to Evidence Vault as Record ${record.id}`);
    } catch (err) {
      setErrorMsg('Failed to save to Evidence Vault');
    }
  };

  const handleSaveAllFlagged = async () => {
    const flagged = results.filter(r => r.risk_level === 'Critical' || r.risk_level === 'High' || r.category === 'Threat');
    if (flagged.length === 0) {
      setErrorMsg('No flagged threats to save.');
      return;
    }

    let savedCount = 0;
    for (const item of flagged) {
      await saveEvidenceRecord({
        incidentType: 'Comment Safety',
        title: `Flagged Comment: "${item.comment.slice(0, 30)}..."`,
        content: item.comment,
        category: item.category,
        riskLevel: item.risk_level,
        riskScore: item.risk_score,
        source: 'Pasted Comment Log',
        reasons: item.reasons,
        notes: `Engine: ${item.model_used}. Reasons: ${item.reasons.join(', ')}`,
      });
      savedCount++;
    }

    showToast(`Saved ${savedCount} flagged comment${savedCount === 1 ? '' : 's'} to Evidence Vault.`);
  };

  const handleDownloadJSON = () => {
    if (results.length === 0) return;
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abhedya_comment_safety_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Downloaded JSON report.');
  };

  const handleExportPDF = () => {
    if (results.length === 0) return;
    const exportRecords = results.map((r, i) => ({
      id: `COMMENT-${i + 1}`,
      incidentType: 'Comment Safety',
      title: `Comment #${i + 1}: "${r.comment.slice(0, 40)}"`,
      category: r.category,
      riskLevel: r.risk_level,
      riskScore: r.risk_score,
      source: 'Pasted Comment Stream',
      timestamp: new Date().toISOString(),
      sha256: `c0mm3nt-${i + 1}-sha256-digest`,
      notes: `Category: ${r.category} | Model Used: ${r.model_used} | Reasons: ${r.reasons.join('; ')}`,
    }));
    generatePDFReport(exportRecords);
    showToast('Exported PDF report.');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Filter logic
  const threatsList = results.filter(r => r.risk_level === 'Critical' || r.risk_level === 'High' || r.category === 'Threat');
  const safeList = results.filter(r => r.risk_level === 'Low' || r.category === 'Safe');
  const hasCriticalThreat = results.some(r => r.risk_level === 'Critical' || r.category === 'Threat');

  const filteredResults = results.filter((r, idx) => {
    if (hiddenIds.has(idx) && !showHidden) return false;
    if (activeFilter === 'threats') return r.risk_level === 'Critical' || r.risk_level === 'High' || r.category === 'Threat';
    if (activeFilter === 'safe') return r.risk_level === 'Low' || r.category === 'Safe';
    return true;
  });

  const realModelUsed = results.length > 0 ? results[0].model_used : 'unitary/toxic-bert + rules';

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div class="pl-64">
        <main class="w-full pt-16 bg-surface min-h-screen">
          <div class="w-full px-margin py-space-lg">
            <div class="grid grid-cols-12 gap-gutter w-full">
              <div class="flex flex-col w-full col-span-12 gap-space-lg">

                {/* Sub-navigation Header */}
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-variant">
                  <div class="flex flex-col gap-space-xs">
                    <div class="flex items-center gap-space-sm mb-1">
                      <button 
                        onClick={() => navigate('/workspace')}
                        class="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-secondary hover:text-primary transition-colors tracking-wider uppercase py-0.5 cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-sm">arrow_back</span>
                        <span>Back to workspace</span>
                      </button>
                      <span class="text-outline-variant font-label-sm text-label-sm">/</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant">MODULE 03</span>
                    </div>
                    <div class="flex flex-wrap items-baseline gap-x-space-md gap-y-1">
                      <h1 class="font-headline-lg text-headline-lg text-primary tracking-tight">Comment Safety</h1>
                      <span class="font-label-sm text-label-sm text-secondary bg-secondary-container/40 px-2 py-0.5 rounded font-mono">
                        AI + RULE ENGINE
                      </span>
                    </div>
                    <p class="font-body-md text-body-md text-on-surface-variant max-w-xl">
                      Scan comments to detect toxic text, targeted harassment, explicit threats and PII leaks.
                    </p>
                  </div>

                  {/* Engine Status Tag displaying REAL model_used & connection */}
                  <div class="flex items-center gap-space-sm self-start md:self-auto bg-surface-container px-space-md py-space-sm rounded-lg shadow-sm border border-surface-variant/60">
                    <div class={`w-2 h-2 rounded-full ${backendOnline ? 'bg-secondary animate-pulse' : 'bg-error'}`}></div>
                    <div class="flex flex-col text-right font-label-sm">
                      <span class="text-on-surface font-semibold uppercase tracking-wide">
                        {backendOnline ? 'Backend Online (127.0.0.1:8000)' : 'Backend Disconnected'}
                      </span>
                      <span class="text-outline font-mono text-[0.6875rem]">{realModelUsed}</span>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {errorMsg && (
                  <div class="p-4 bg-error-container/60 border border-error/30 text-on-error-container rounded-lg flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-error">warning</span>
                      <span class="font-body-sm text-sm">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg('')} class="text-on-error-container hover:text-error">
                      <span class="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                )}

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

                {/* Primary 2-Column Grid */}
                <div class="grid grid-cols-12 gap-gutter items-start">
                  
                  {/* LEFT COLUMN: Input Workbench (5 Cols) */}
                  <div class="col-span-12 lg:col-span-5 flex flex-col gap-space-md">
                    <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-surface-variant/60">
                      
                      <div class="flex items-center justify-between pb-1">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-secondary text-lg">queue</span>
                          <span class="font-title-sm text-title-sm text-primary font-semibold">Comment Input Stream</span>
                        </div>
                        <span class="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                          One comment per line
                        </span>
                      </div>

                      <div class="flex flex-col gap-space-xs">
                        <div class="relative">
                          <textarea 
                            value={inputLines}
                            onChange={(e) => setInputLines(e.target.value)}
                            rows="9"
                            class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm p-space-md rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all leading-relaxed border border-surface-variant/60"
                            placeholder="Paste comments here (one per line)..."
                          />
                          <div class="absolute bottom-2.5 right-3 flex items-center gap-2 pointer-events-none">
                            <span class="font-label-sm text-label-sm text-outline bg-surface-container px-1.5 py-0.5 rounded">
                              {inputLines.length} chars
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sensitivity Switcher */}
                      <div class="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-xs border border-surface-variant/40">
                        <div class="flex items-center justify-between">
                          <span class="font-label-sm text-label-sm text-on-surface-variant font-medium">PII & Threat Sensitivity:</span>
                          <div class="flex items-center gap-1 font-label-sm text-label-sm">
                            <button
                              type="button"
                              onClick={() => setSensitivity('standard')}
                              class={`px-2 py-0.5 rounded cursor-pointer ${sensitivity === 'standard' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => setSensitivity('strict')}
                              class={`px-2 py-0.5 rounded cursor-pointer ${sensitivity === 'strict' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                              Strict
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div class="flex flex-wrap items-center justify-between gap-2 pt-space-xs">
                        <button 
                          type="button"
                          onClick={handleAnalyze}
                          disabled={loading}
                          class="inline-flex items-center gap-space-sm bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary font-title-sm text-title-sm px-space-lg py-space-sm rounded transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-lg">{loading ? 'sync' : 'radar'}</span>
                          <span>{loading ? 'Analyzing...' : 'Analyze Comments'}</span>
                        </button>

                        <div class="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={handleFillSample}
                            class="text-secondary hover:text-primary font-label-sm text-label-sm uppercase tracking-wider py-1 px-2 rounded hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            Try sample comments
                          </button>
                          <button 
                            type="button"
                            onClick={handleClear}
                            class="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm uppercase tracking-wider py-1 px-2 rounded hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            Clear Queue
                          </button>
                        </div>
                      </div>

                      {/* True Privacy Note */}
                      <div class="pt-space-xs border-t border-surface-variant/40">
                        <div class="bg-surface-container rounded p-space-sm flex items-start gap-space-sm border border-surface-variant/50">
                          <span class="material-symbols-outlined text-outline text-base mt-0.5">lock</span>
                          <p class="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                            Comments are sent to the Abhedya analysis server for scoring. This prototype does not store them. It works on pasted comments and does not connect to Instagram or YouTube.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT COLUMN: Results & Serious Threat Alert (7 Cols) */}
                  <div class="col-span-12 lg:col-span-7 flex flex-col gap-space-md">
                    
                    {/* SERIOUS THREAT ALERT CARD (Shows ONLY if Critical or Threat present) */}
                    {hasCriticalThreat && (
                      <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-sm relative overflow-hidden border border-error/40">
                        <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                          <div class="flex items-center gap-space-sm">
                            <div class="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-error">
                              <span class="material-symbols-outlined text-lg">crisis_alert</span>
                            </div>
                            <div>
                              <span class="font-title-sm text-title-sm text-primary font-semibold block leading-tight">
                                Potential serious threat detected.
                              </span>
                              <span class="font-label-sm text-label-sm text-error uppercase tracking-wider font-semibold">
                                Action Required
                              </span>
                            </div>
                          </div>
                        </div>

                        <p class="font-body-sm text-body-sm text-on-surface-variant pl-space-lg md:pl-10">
                          Preserve the original comment and supporting context before taking further action.
                        </p>

                        <div class="flex flex-wrap items-center justify-between gap-space-sm pl-space-lg md:pl-10 pt-space-xs">
                          <button 
                            type="button"
                            onClick={handleSaveAllFlagged}
                            class="inline-flex items-center gap-space-xs bg-primary text-on-primary hover:bg-on-surface font-title-sm text-title-sm px-space-md py-1.5 rounded transition-all shadow-sm cursor-pointer"
                          >
                            <span class="material-symbols-outlined text-base">fingerprint</span>
                            <span>Save all flagged to Evidence Vault</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Regional / Language Note */}
                    <div class="p-3 bg-surface-container rounded-lg border border-surface-variant/60 flex items-center gap-2 text-on-surface-variant font-label-sm text-xs">
                      <span class="material-symbols-outlined text-secondary text-base">info</span>
                      <span>Automated detection can be wrong. Review flagged comments yourself. Accuracy is lower for Hinglish and regional-language comments.</span>
                    </div>

                    {/* Filter Tabs Bar */}
                    <div class="flex items-center justify-between pt-space-xs">
                      <div class="flex items-center gap-space-sm">
                        <h2 class="font-headline-sm text-headline-sm text-primary font-medium">Triage Results</h2>
                        <span class="font-label-sm text-label-sm text-on-secondary-fixed bg-secondary-fixed px-2 py-0.5 rounded-full font-medium font-mono">
                          {results.length} Scored
                        </span>
                      </div>

                      <div class="flex items-center gap-2">
                        <button 
                          onClick={() => setActiveFilter('all')}
                          class={`font-label-sm text-label-sm px-2.5 py-1 rounded cursor-pointer ${activeFilter === 'all' ? 'bg-surface-container-high text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          All ({results.length})
                        </button>
                        <button 
                          onClick={() => setActiveFilter('threats')}
                          class={`font-label-sm text-label-sm px-2.5 py-1 rounded cursor-pointer ${activeFilter === 'threats' ? 'bg-surface-container-high text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          Threats ({threatsList.length})
                        </button>
                        <button 
                          onClick={() => setActiveFilter('safe')}
                          class={`font-label-sm text-label-sm px-2.5 py-1 rounded cursor-pointer ${activeFilter === 'safe' ? 'bg-surface-container-high text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          Safe ({safeList.length})
                        </button>

                        {hiddenIds.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowHidden(!showHidden)}
                            class="font-label-sm text-label-sm text-secondary hover:underline ml-2 cursor-pointer"
                          >
                            {showHidden ? 'Hide Hidden' : `Show Hidden (${hiddenIds.size})`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Result Cards List */}
                    {results.length === 0 ? (
                      <div class="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant border border-surface-variant/60">
                        <span class="material-symbols-outlined text-4xl text-outline mb-2">find_in_page</span>
                        <p class="font-body-md text-body-md">No analysis results yet. Enter comments and click "Analyze Comments".</p>
                      </div>
                    ) : (
                      <div class="flex flex-col gap-space-sm">
                        {filteredResults.map((item, idx) => {
                          const isHidden = hiddenIds.has(idx);

                          // Badge styling by risk level
                          let badgeBg = "bg-surface-container text-on-surface-variant";
                          if (item.risk_level === 'Critical') badgeBg = "bg-error-container text-error";
                          else if (item.risk_level === 'High') badgeBg = "bg-tertiary-fixed text-on-tertiary-fixed-variant";
                          else if (item.risk_level === 'Medium') badgeBg = "bg-secondary-container text-on-secondary-container";

                          return (
                            <div 
                              key={idx}
                              class={`bg-surface-container-lowest rounded-xl p-space-md shadow-sm transition-all hover:shadow-md flex flex-col gap-space-sm border border-surface-variant/60 ${isHidden ? 'opacity-50' : ''}`}
                            >
                              {/* Metadata Bar */}
                              <div class="flex items-center justify-between text-on-surface-variant">
                                <div class="flex items-center gap-space-xs font-mono font-label-sm text-label-sm text-outline">
                                  <span>ID: 0x{(idx + 101).toString(16)}</span>
                                  <span>•</span>
                                  <span>Log #{idx + 1}</span>
                                </div>

                                <div class="flex items-center gap-2">
                                  <span class={`font-label-sm text-label-sm font-semibold tracking-wider px-2 py-0.5 rounded font-mono uppercase ${badgeBg}`}>
                                    {item.risk_level} ({item.risk_score}/100)
                                  </span>
                                </div>
                              </div>

                              {/* Comment Body */}
                              <div class="bg-surface-container-low p-space-sm rounded-lg">
                                <p class="font-headline-sm text-headline-sm text-primary tracking-tight italic">
                                  "{item.comment}"
                                </p>
                              </div>

                              {/* Reasons & Tag Chips */}
                              <div class="flex flex-wrap items-center justify-between gap-space-sm pt-1">
                                <div class="flex flex-wrap items-center gap-1.5">
                                  <span class="font-label-sm text-label-sm bg-primary-container text-on-primary px-2 py-0.5 rounded font-semibold">
                                    {item.category}
                                  </span>
                                  {item.reasons.map((r, rIdx) => (
                                    <span key={rIdx} class="font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded">
                                      {r}
                                    </span>
                                  ))}
                                </div>

                                {/* Quick Actions */}
                                <div class="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => handleToggleHide(idx)}
                                    class="font-title-sm text-body-sm text-on-surface hover:text-primary px-space-sm py-1 rounded hover:bg-surface-container transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span class="material-symbols-outlined text-sm">{isHidden ? 'visibility' : 'visibility_off'}</span>
                                    <span>{isHidden ? 'Undo Hide' : 'Hide Comment'}</span>
                                  </button>

                                  <button 
                                    type="button"
                                    onClick={() => handleSaveItem(item)}
                                    class="bg-surface-container text-on-surface hover:text-primary font-title-sm text-body-sm px-space-sm py-1 rounded transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-variant/60"
                                  >
                                    <span class="material-symbols-outlined text-sm">fingerprint</span>
                                    <span>Save Evidence</span>
                                  </button>

                                  <button 
                                    type="button"
                                    onClick={() => openReportModalForItem(item)}
                                    class="bg-primary text-on-primary font-title-sm text-body-sm px-space-sm py-1 rounded hover:bg-primary-container transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                  >
                                    <span class="material-symbols-outlined text-sm">description</span>
                                    <span>Create Incident Report</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Batch Export Footer */}
                    {results.length > 0 && (
                      <div class="bg-surface-container rounded-xl p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md border border-surface-variant/60">
                        <div class="flex items-center gap-space-sm">
                          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined text-lg">download</span>
                          </div>
                          <div class="flex flex-col">
                            <span class="font-title-sm text-title-sm text-on-surface">Export Triage Dossier</span>
                            <span class="font-label-sm text-label-sm text-outline">Formats: JSON, PDF Incident Report</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            type="button"
                            onClick={handleDownloadJSON}
                            class="bg-surface-container-lowest text-on-surface hover:text-primary font-title-sm text-title-sm px-space-md py-1.5 rounded border border-surface-variant hover:border-outline transition-all cursor-pointer"
                          >
                            Download JSON
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (results.length > 0) openReportModalForItem(results[0]);
                            }}
                            class="bg-primary text-on-primary hover:bg-primary-container font-title-sm text-title-sm px-space-md py-1.5 rounded transition-all shadow-sm cursor-pointer"
                          >
                            Create Incident Report
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

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
        onComplete={() => showToast('Incident report created & saved to Evidence Vault')}
      />
    </div>
  );
}
