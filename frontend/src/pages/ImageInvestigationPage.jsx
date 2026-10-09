import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { loadImageFile, compareImages } from '../utils/imageDiff';
import { hashFile, formatHash } from '../utils/hash';
import { saveEvidenceRecord, getEvidenceRecords } from '../services/evidenceStore';
import IncidentReportModal from '../components/IncidentReportModal';

export default function ImageInvestigationPage() {
  const navigate = useNavigate();

  // Workspace Mode: 'integrity' (Integrity Checker) | 'investigate' (Forensic Diff)
  const [activeMode, setActiveMode] = useState('integrity');

  // Core Upload States
  const [fileOrig, setFileOrig] = useState(null);
  const [fileSusp, setFileSusp] = useState(null);

  const [imgOrigObj, setImgOrigObj] = useState(null);
  const [imgSuspObj, setImgSuspObj] = useState(null);

  const [hashOrig, setHashOrig] = useState('');
  const [hashSusp, setHashSusp] = useState('');

  const [dimOrig, setDimOrig] = useState({ w: 0, h: 0 });
  const [dimSusp, setDimSusp] = useState({ w: 0, h: 0 });

  const [threshold, setThreshold] = useState(30);

  const [diffResults, setDiffResults] = useState(null);
  const [investigationId, setInvestigationId] = useState('');
  const [userNotes, setUserNotes] = useState('');

  // Integrity Checker Specific States
  const [savedVaultRecords, setSavedVaultRecords] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  const [integrityOutcome, setIntegrityOutcome] = useState(null);

  // Disputed Evidence Report Modal State
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  const inputOrigRef = useRef(null);
  const inputSuspRef = useRef(null);

  // Initialize random case ID & Load Vault Records
  useEffect(() => {
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvestigationId(`INV-${nowStr}-${rand}`);

    try {
      const records = getEvidenceRecords();
      setSavedVaultRecords(records || []);
    } catch (err) {
      console.error('Failed to load vault records:', err);
    }
  }, []);

  // Handle Original / Reference File Upload
  const handleOrigUpload = async (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload PNG, JPG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10 MB limit.');
      return;
    }
    setErrorMsg('');
    setSelectedVaultId('');
    setFileOrig(file);
    const hash = await hashFile(file);
    setHashOrig(hash);

    const img = await loadImageFile(file);
    setImgOrigObj(img);
    setDimOrig({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Handle Suspected File Upload
  const handleSuspUpload = async (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload PNG, JPG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10 MB limit.');
      return;
    }
    setErrorMsg('');
    setFileSusp(file);
    const hash = await hashFile(file);
    setHashSusp(hash);

    const img = await loadImageFile(file);
    setImgSuspObj(img);
    setDimSusp({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Select Vault Record as Reference
  const handleSelectVaultReference = async (id) => {
    setSelectedVaultId(id);
    setErrorMsg('');
    if (!id) {
      setFileOrig(null);
      setImgOrigObj(null);
      setHashOrig('');
      return;
    }

    const rec = savedVaultRecords.find((r) => r.id === id);
    if (rec && rec.thumbnailUrl) {
      try {
        const res = await fetch(rec.thumbnailUrl);
        const blob = await res.blob();
        const file = new File([blob], `Vault_Reference_${rec.id}.png`, { type: 'image/png' });
        await handleOrigUpload(file);
      } catch (e) {
        setHashOrig(rec.sha256 || '');
      }
    }
  };

  // Run Image Comparison whenever images or threshold change
  useEffect(() => {
    if (imgOrigObj && imgSuspObj) {
      const res = compareImages(imgOrigObj, imgSuspObj, threshold);
      setDiffResults(res);
      evaluateIntegrityOutcome(res);
    } else {
      setDiffResults(null);
      setIntegrityOutcome(null);
    }
  }, [imgOrigObj, imgSuspObj, threshold]);

  // Evaluate Integrity Outcome Decision Tree
  const evaluateIntegrityOutcome = (res) => {
    if (!hashSusp) {
      setIntegrityOutcome(null);
      return;
    }

    if (hashOrig && hashSusp && hashOrig === hashSusp) {
      setIntegrityOutcome({
        status: 'Exact Match',
        color: 'bg-secondary-container text-on-secondary-container',
        icon: 'verified',
        details: 'SHA-256 cryptographic hashes match exactly. Binary file content is identical to trusted reference.',
      });
      return;
    }

    if (res && res.diffPercent > 0) {
      setIntegrityOutcome({
        status: 'Visual Differences Detected',
        color: 'bg-tertiary-container text-on-tertiary-container',
        icon: 'difference',
        details: `Cryptographic hashes differ. Visual difference analysis detected a ${res.diffPercent}% pixel delta across ${res.changedRegionsCount} localized regions.`,
      });
      return;
    }

    if (res && res.diffPercent === 0) {
      setIntegrityOutcome({
        status: 'Exact Match',
        color: 'bg-secondary-container text-on-secondary-container',
        icon: 'check_circle',
        details: 'Visual pixels match 100%, though SHA-256 hashes differ due to header metadata or re-encoding changes.',
      });
      return;
    }

    if (!fileOrig && !selectedVaultId) {
      setIntegrityOutcome({
        status: 'Reference Not Found',
        color: 'bg-surface-container-high text-on-surface-variant',
        icon: 'search_off',
        details: 'No matching cryptographic SHA-256 hash or reference image was selected from local browser storage (`localStorage`).',
      });
      return;
    }

    setIntegrityOutcome({
      status: 'Inconclusive',
      color: 'bg-error-container text-on-error-container',
      icon: 'help_outline',
      details: 'Insufficient image rendering data to perform per-pixel comparison.',
    });
  };

  // Reset workspace
  const handleReset = () => {
    setFileOrig(null);
    setFileSusp(null);
    setImgOrigObj(null);
    setImgSuspObj(null);
    setHashOrig('');
    setHashSusp('');
    setDiffResults(null);
    setIntegrityOutcome(null);
    setSelectedVaultId('');
    setUserNotes('');
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvestigationId(`INV-${nowStr}-${rand}`);
  };

  // Save Investigation to Vault
  const handleSaveInvestigation = async () => {
    if (!diffResults && !fileSusp) {
      setErrorMsg('Please upload a suspected image to evaluate integrity before saving.');
      return;
    }

    try {
      const record = await saveEvidenceRecord({
        id: investigationId,
        incidentType: 'Photo Integrity Check',
        title: `Integrity Check: ${fileSusp ? fileSusp.name : 'Photo'} (${integrityOutcome?.status || 'Evaluated'})`,
        content: `Outcome: ${integrityOutcome?.status || 'Evaluated'} | Pixel Delta: ${diffResults ? diffResults.diffPercent : 0}% | Ref Hash: ${hashOrig || 'N/A'} | Suspected Hash: ${hashSusp}`,
        category: 'Evidence Integrity',
        riskLevel: diffResults && diffResults.diffPercent > 25 ? 'High' : diffResults && diffResults.diffPercent > 5 ? 'Medium' : 'Low',
        riskScore: diffResults ? Math.min(100, Math.round(diffResults.diffPercent * 3)) : 0,
        source: fileOrig && fileSusp ? `${fileOrig.name} vs ${fileSusp.name}` : fileSusp ? `Suspected: ${fileSusp.name}` : 'Local Upload',
        notes: userNotes ? userNotes : `Integrity verification outcome: ${integrityOutcome?.status}. ${integrityOutcome?.details}`,
        thumbnailUrl: diffResults ? diffResults.thumbnailUrl : null,
      });

      showToast(`Integrity check saved to Evidence Vault as Record ${record.id}`);
    } catch (err) {
      setErrorMsg('Failed to save record to Evidence Vault');
    }
  };

  const handleOpenReportModal = () => {
    if (!diffResults || !fileSusp) {
      setErrorMsg('Please upload images and run integrity check before creating a report.');
      return;
    }

    setModalInitialData({
      defaultIncidentType: 'Photo Integrity Investigation',
      defaultDescription: `Image integrity assessment performed on "${fileSusp.name}". Verification outcome: ${integrityOutcome?.status || 'Evaluated'} (${diffResults.diffPercent}% pixel delta).`,
      platform: 'Online Platform',
      sourceModule: 'Integrity Checker',
      originalContent: `Suspected: ${fileSusp.name} | SHA-256: ${hashSusp} | Ref SHA-256: ${hashOrig || 'None'} | Delta: ${diffResults.diffPercent}%`,
      category: 'Image Integrity Investigation',
      riskLevel: diffResults.diffPercent > 25 ? 'High' : diffResults.diffPercent > 5 ? 'Medium' : 'Low',
      riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
      reasons: [
        `Integrity Status: ${integrityOutcome?.status}`,
        `Visual pixel delta: ${diffResults.diffPercent}%`,
        `Mean Abs Difference (MAD): ${diffResults.mad}`,
      ],
      thumbnailUrl: diffResults.thumbnailUrl,
    });
    setIsReportModalOpen(true);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Derived facts & evidence gaps for Disputed Evidence Review Report
  const currentStatus = integrityOutcome?.status || (!fileOrig && fileSusp ? 'Reference Not Found' : 'Inconclusive');
  const timestampNow = new Date().toLocaleString();

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div className="pl-64">
        <main className="w-full pt-16 bg-surface min-h-screen">
          <div className="w-full px-margin py-space-lg">
            <div className="grid grid-cols-12 gap-gutter w-full">
              <div className="flex flex-col w-full col-span-12 gap-space-lg">
                
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-variant">
                  <div className="flex flex-col gap-space-xs">
                    <button 
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-body-sm text-body-sm w-fit cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Back to home</span>
                    </button>
                    <div className="flex items-baseline gap-space-md mt-1 flex-wrap">
                      <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
                        {activeMode === 'integrity' ? 'Photo Evidence Integrity Checker' : 'Image Investigation'}
                      </h1>
                      <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/40 px-2.5 py-0.5 rounded font-mono">
                        CASE #{investigationId}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                      {activeMode === 'integrity' 
                        ? 'Verify media integrity by checking cryptographic SHA-256 fingerprints and visual pixel deltas against trusted local records.'
                        : 'Compare an authentic reference source with a suspected variant image using per-pixel delta analysis and heatmap overlays.'}
                    </p>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center p-1 bg-surface-container rounded border border-surface-variant self-start md:self-end">
                    <button 
                      onClick={() => setActiveMode('integrity')}
                      className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all cursor-pointer ${
                        activeMode === 'integrity' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Integrity Checker
                    </button>
                    <button 
                      onClick={() => setActiveMode('investigate')}
                      className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all cursor-pointer ${
                        activeMode === 'investigate' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Forensic Diff Mode
                    </button>
                  </div>
                </header>

                {/* Alerts */}
                {errorMsg && (
                  <div className="p-4 bg-error-container/60 border border-error/30 text-on-error-container rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-error">warning</span>
                      <span className="font-body-sm text-sm">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg('')} className="text-on-error-container hover:text-error cursor-pointer">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                )}

                {toastMsg && (
                  <div className="p-4 bg-primary text-on-primary rounded-lg flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-fixed-dim">check_circle</span>
                      <span className="font-body-sm text-sm font-medium">{toastMsg}</span>
                    </div>
                    <button onClick={() => setToastMsg('')} className="text-on-primary cursor-pointer">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                )}

                {/* VERIFICATION OUTCOME BANNER */}
                {activeMode === 'integrity' && fileSusp && (
                  <section className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-variant/80 shadow-sm flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Verification Outcome</span>
                      {integrityOutcome ? (
                        <span className={`px-3 py-1 rounded-full font-label-md text-label-md font-bold flex items-center gap-1.5 ${integrityOutcome.color}`}>
                          <span className="material-symbols-outlined text-base">{integrityOutcome.icon}</span>
                          {integrityOutcome.status}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full font-label-md text-label-md bg-surface-container-high text-on-surface-variant font-mono">
                          Reference Not Found
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-surface-variant/40 font-mono leading-relaxed">
                      {integrityOutcome ? integrityOutcome.details : 'No matching registered reference image found in local browser storage (`localStorage`). Upload a trusted reference or select a vault record below.'}
                    </p>

                    {/* Cryptographic Hashes Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm text-xs font-mono bg-surface-container-low p-2.5 rounded border border-surface-variant/40">
                      <div>
                        <span className="font-semibold text-outline block mb-0.5">SUSPECTED IMAGE SHA-256:</span>
                        <span className="text-primary font-medium break-all">{hashSusp || 'Calculating...'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-outline block mb-0.5">REFERENCE IMAGE SHA-256:</span>
                        <span className="text-primary font-medium break-all">{hashOrig || 'No Reference Selected'}</span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Upload & Reference Section */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                  
                  {/* Reference Image Card */}
                  <article className="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-variant/80">
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-variant/50">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">verified</span>
                        <span className="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">
                          Trusted Reference
                        </span>
                      </div>
                      
                      {savedVaultRecords.length > 0 && (
                        <select 
                          value={selectedVaultId} 
                          onChange={(e) => handleSelectVaultReference(e.target.value)}
                          className="text-xs p-1 bg-surface-container rounded border border-surface-variant text-on-surface focus:outline-none"
                        >
                          <option value="">-- Load from Local Vault --</option>
                          {savedVaultRecords.map(r => (
                            <option key={r.id} value={r.id}>{r.id} ({r.category || 'Record'})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="relative aspect-square w-full rounded overflow-hidden bg-surface-container flex items-center justify-center border border-surface-variant/60">
                      {!fileOrig ? (
                        <div 
                          onClick={() => inputOrigRef.current?.click()}
                          className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-surface-container-high transition-colors w-full h-full"
                        >
                          <span className="material-symbols-outlined text-3xl text-secondary mb-2">upload_file</span>
                          <span className="font-title-sm text-title-sm text-primary font-semibold">Upload Trusted Reference</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Select authentic source image</span>
                        </div>
                      ) : (
                        <img 
                          src={URL.createObjectURL(fileOrig)} 
                          alt="Original reference" 
                          className="w-full h-full object-contain"
                        />
                      )}
                      <input 
                        ref={inputOrigRef}
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                        onChange={(e) => handleOrigUpload(e.target.files[0])}
                      />
                    </div>

                    {fileOrig && (
                      <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                        <span>{fileOrig.name} ({dimOrig.w} × {dimOrig.h} px)</span>
                        <span className="font-mono text-[0.6875rem]">SHA-256: {formatHash(hashOrig)}</span>
                      </div>
                    )}
                  </article>

                  {/* Suspected Image Card */}
                  <article className="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-variant/80">
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-variant/50">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-error text-base">warning</span>
                        <span className="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">
                          Suspected Image
                        </span>
                      </div>
                      {fileSusp && (
                        <span className="font-label-sm text-label-sm text-error bg-error-container/40 px-2 py-0.5 rounded font-mono font-medium">
                          {(fileSusp.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    <div className="relative aspect-square w-full rounded overflow-hidden bg-surface-container flex items-center justify-center border border-surface-variant/60">
                      {!fileSusp ? (
                        <div 
                          onClick={() => inputSuspRef.current?.click()}
                          className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-surface-container-high transition-colors w-full h-full"
                        >
                          <span className="material-symbols-outlined text-3xl text-secondary mb-2">find_in_page</span>
                          <span className="font-title-sm text-title-sm text-primary font-semibold">Upload Suspected Image</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Select suspected media file</span>
                        </div>
                      ) : (
                        <img 
                          src={URL.createObjectURL(fileSusp)} 
                          alt="Suspected variant" 
                          className="w-full h-full object-contain"
                        />
                      )}
                      <input 
                        ref={inputSuspRef}
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                        onChange={(e) => handleSuspUpload(e.target.files[0])}
                      />
                    </div>

                    {fileSusp && (
                      <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                        <span>{fileSusp.name} ({dimSusp.w} × {dimSusp.h} px)</span>
                        <span className="font-mono text-[0.6875rem]">SHA-256: {formatHash(hashSusp)}</span>
                      </div>
                    )}
                  </article>

                </section>

                {/* Heatmap Section */}
                {diffResults && (
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                    
                    <div className="lg:col-span-7 bg-surface-container-lowest rounded-lg p-space-md shadow-sm border border-surface-variant/80 flex flex-col gap-space-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-surface-variant/50">
                        <div>
                          <h2 className="font-title-md text-title-md text-primary">Visual Difference Heatmap</h2>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Per-pixel delta contour rendering</span>
                        </div>
                      </div>

                      <div className="relative aspect-square w-full rounded overflow-hidden bg-primary-container flex items-center justify-center border border-surface-variant/60">
                        <img 
                          src={diffResults.thumbnailUrl} 
                          alt="Per-pixel visual difference heatmap" 
                          className="w-full h-full object-contain"
                        />

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded bg-surface/90 backdrop-blur-md border border-surface-variant/60">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-base">tune</span>
                            <span className="font-label-sm text-label-sm text-on-surface">Sensitivity Filter:</span>
                            <span className="font-label-sm text-label-sm font-mono text-primary font-semibold">{threshold}</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="100"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-32 h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-space-sm pt-space-xs text-center border-t border-surface-variant/40 font-label-sm">
                        <div className="p-2 bg-surface-container rounded">
                          <span className="block text-on-surface-variant text-[0.6875rem]">Visual Delta Detected</span>
                          <span className={`font-semibold text-label-md ${diffResults.diffDetected ? 'text-error' : 'text-secondary'}`}>
                            {diffResults.diffDetected ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="p-2 bg-surface-container rounded">
                          <span className="block text-on-surface-variant text-[0.6875rem]">Mean Abs Diff (MAD)</span>
                          <span className="font-semibold text-primary font-mono">{diffResults.mad}</span>
                        </div>
                        <div className="p-2 bg-surface-container rounded">
                          <span className="block text-on-surface-variant text-[0.6875rem]">Peak SNR (PSNR)</span>
                          <span className="font-semibold text-primary font-mono">{diffResults.psnr} dB</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col gap-space-md">
                      <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm border border-surface-variant/80 flex flex-col gap-space-md">
                        
                        <div className="p-space-md rounded bg-surface-container-low border border-surface-variant flex items-center justify-between">
                          <div>
                            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest block font-medium">
                              Visual Difference Delta
                            </span>
                            <div className="font-display-hero text-headline-lg text-primary tracking-tight font-normal leading-none mt-1">
                              {diffResults.diffPercent}%
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1 block">
                              Pixel difference across target canvas area (Match: {diffResults.matchPercent}%).
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 border-t border-surface-variant/40 pt-space-sm">
                          <label className="font-label-sm text-label-sm text-on-surface font-medium uppercase tracking-wider" htmlFor="user-notes">
                            Integrity Notes
                          </label>
                          <textarea 
                            id="user-notes"
                            rows="2"
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            className="w-full p-2.5 bg-surface-container-low rounded text-body-sm text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-variant/60"
                            placeholder="Add analytical notes before saving record..."
                          />
                        </div>

                      </div>
                    </div>

                  </section>
                )}

                {/* Ethical Guardrails & Storage Disclaimers */}
                <aside className="p-space-md rounded-lg bg-surface-container border border-surface-variant flex flex-col gap-1 text-xs text-on-surface-variant leading-relaxed">
                  <span className="font-label-md text-label-md text-primary font-semibold uppercase tracking-wider block">
                    Ethical & System Limitations Notice
                  </span>
                  <p>
                    <strong>Visual Differences & Hash Mismatches:</strong> A pixel delta or hash mismatch indicates visual modifications, compression, resizing, or metadata edits. It does <em>not</em> constitute proof of malicious manipulation or false reporting.
                  </p>
                  <p>
                    <strong>Storage Boundary:</strong> Verification checks are performed strictly against browser local storage (`localStorage`). Photos registered on other devices will return 'Reference Not Found' unless saved locally.
                  </p>
                </aside>

                {/* Footer Controls */}
                <footer className="flex flex-col sm:flex-row items-center justify-between gap-space-md p-space-md bg-surface-container-lowest rounded-lg border border-surface-variant shadow-sm mb-space-xl">
                  <button 
                    type="button"
                    onClick={handleReset}
                    className="px-space-md py-2.5 rounded font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-variant/60"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    <span>Reset / New Check</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-space-sm w-full sm:w-auto justify-end">
                    
                    {/* NEW: Generate Disputed Evidence Review Report Button */}
                    <button 
                      type="button"
                      onClick={() => {
                        if (!fileSusp) {
                          setErrorMsg('Please upload a suspected image before generating a review report.');
                          return;
                        }
                        setIsReportViewOpen(true);
                      }}
                      disabled={!fileSusp}
                      className="px-space-md py-2.5 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary/20 disabled:opacity-50 font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-2 border border-secondary/30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">assessment</span>
                      <span>Generate Disputed Evidence Report</span>
                    </button>

                    <button 
                      type="button"
                      onClick={handleSaveInvestigation}
                      disabled={!diffResults && !fileSusp}
                      className="px-space-md py-2.5 rounded bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-2 border border-surface-variant/60 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-secondary">save</span>
                      <span>Save Record</span>
                    </button>

                    <button 
                      type="button"
                      onClick={handleOpenReportModal}
                      disabled={!diffResults}
                      className="px-space-lg py-2.5 rounded bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-2 shadow hover:shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">description</span>
                      <span>Create Incident Report</span>
                    </button>
                  </div>
                </footer>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DISPUTED EVIDENCE REVIEW REPORT MODAL */}
      {isReportViewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-xl max-w-3xl w-full p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto font-sans print:p-0 print:shadow-none print:max-h-none print:overflow-visible">
            
            {/* Action Header Bar (Hidden during print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-900 text-2xl">assessment</span>
                <h2 className="text-xl font-bold text-gray-900">Disputed Evidence Review Report</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-purple-900 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>Download / Print PDF</span>
                </button>
                <button
                  onClick={() => setIsReportViewOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* PRINTABLE REPORT BODY */}
            <div className="flex flex-col gap-6 text-sm text-gray-800">
              
              {/* Header Title */}
              <div className="border-b-2 border-purple-900 pb-3 flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-900">ABHEDYA Safety & Verification Engine</span>
                  <h1 className="text-2xl font-extrabold text-gray-900">Disputed Evidence Review Report</h1>
                </div>
                <div className="text-right text-xs text-gray-500 font-mono">
                  <span>CONFIDENTIAL REVIEW</span>
                </div>
              </div>

              {/* Section 1: Case Information */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b pb-1 mb-2 uppercase text-xs text-purple-900 tracking-wider">1. Case Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><strong className="text-gray-600">Case ID:</strong> {investigationId}</div>
                  <div><strong className="text-gray-600">Date & Time:</strong> {timestampNow}</div>
                  <div><strong className="text-gray-600">Suspected File:</strong> {fileSusp ? fileSusp.name : 'N/A'}</div>
                  <div><strong className="text-gray-600">Reference File:</strong> {fileOrig ? fileOrig.name : (selectedVaultId ? `Vault Record #${selectedVaultId}` : 'None Provided')}</div>
                  <div><strong className="text-gray-600">Analysis Mode:</strong> {activeMode === 'integrity' ? 'Photo Evidence Integrity Checker' : 'Forensic Diff Analysis'}</div>
                </div>
              </div>

              {/* Section 2: Verification Findings */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b pb-1 mb-2 uppercase text-xs text-purple-900 tracking-wider">2. Technical Verification Findings</h3>
                <div className="flex flex-col gap-2 text-xs font-mono">
                  <div>
                    <strong className="text-gray-600 font-sans">Suspected SHA-256:</strong><br/>
                    <span className="text-gray-900 break-all">{hashSusp || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="text-gray-600 font-sans">Reference SHA-256:</strong><br/>
                    <span className="text-gray-900 break-all">{hashOrig || 'No Trusted Reference Selected'}</span>
                  </div>
                  <div className="pt-1 font-sans">
                    <strong className="text-gray-600">Hash Check Result:</strong>{' '}
                    <span className="font-semibold">{hashOrig ? (hashOrig === hashSusp ? 'Exact Match' : 'Hash Mismatch') : 'Reference Not Found'}</span>
                  </div>
                  {diffResults && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t mt-1 text-center font-sans">
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 block text-[10px]">Pixel Delta</span><strong>{diffResults.diffPercent}%</strong></div>
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 block text-[10px]">MAD Score</span><strong>{diffResults.mad}</strong></div>
                      <div className="bg-white p-2 rounded border"><span className="text-gray-500 block text-[10px]">PSNR</span><strong>{diffResults.psnr} dB</strong></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Verified Facts */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b pb-1 mb-2 uppercase text-xs text-purple-900 tracking-wider">3. Verified Facts</h3>
                <ul className="list-disc pl-5 text-xs text-gray-700 flex flex-col gap-1">
                  {hashOrig && hashSusp && hashOrig === hashSusp && <li>Binary cryptographic hashes match 100% across both uploaded files.</li>}
                  {hashOrig && hashSusp && hashOrig !== hashSusp && <li>Binary cryptographic hashes differ between suspected and reference images.</li>}
                  {diffResults && diffResults.diffPercent > 0 && <li>Visual per-pixel difference analysis detected a {diffResults.diffPercent}% delta across {diffResults.changedRegionsCount} localized region(s).</li>}
                  {diffResults && diffResults.diffPercent === 0 && <li>Visual rendering analysis indicates 0% pixel delta between images.</li>}
                  {!fileOrig && !selectedVaultId && <li>No trusted reference image or registered SHA-256 fingerprint was provided in local storage.</li>}
                  <li>Findings reflect local canvas rendering calculations executed at sensitivity threshold {threshold}.</li>
                </ul>
              </div>

              {/* Section 4: Evidence Gaps */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-900 border-b border-amber-200 pb-1 mb-2 uppercase text-xs tracking-wider">4. Identified Evidence Gaps</h3>
                <ul className="list-disc pl-5 text-xs text-amber-900 flex flex-col gap-1">
                  {!fileOrig && !selectedVaultId && <li>Original, unedited reference image is unavailable in local browser vault.</li>}
                  <li>Origin, metadata provenance, and source platform of the image were not independently verified.</li>
                  <li>Relevant message logs, conversation threads, or context screenshots were not supplied with this image file.</li>
                  <li>Original device timestamps and EXIF camera data could not be verified from compressed browser buffers.</li>
                </ul>
              </div>

              {/* Section 5: Review Status */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 uppercase text-xs text-purple-900 tracking-wider">5. Overall Review Status</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Based on technical canvas calculations and available reference data.</p>
                </div>
                <div className="px-4 py-1.5 rounded-full font-bold text-sm bg-purple-900 text-white">
                  {currentStatus}
                </div>
              </div>

              {/* Section 6: Recommended Next Steps */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b pb-1 mb-2 uppercase text-xs text-purple-900 tracking-wider">6. Recommended Next Steps</h3>
                <ol className="list-decimal pl-5 text-xs text-gray-700 flex flex-col gap-1">
                  <li>Request the original uncompressed media file directly from the trusted author or device source, if available.</li>
                  <li>Preserve all original files, raw headers, and associated messaging threads in the Evidence Vault.</li>
                  <li>Independently verify sender handles, publication dates, and platform timestamps.</li>
                  <li>Submit findings to a qualified human reviewer or forensic examiner for full qualitative evaluation.</li>
                </ol>
              </div>

              {/* Section 7: Important Disclaimer */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-950 text-xs leading-relaxed">
                <strong className="block font-bold text-red-900 mb-1 uppercase tracking-wider">Important Disclaimer</strong>
                “This report documents technical comparisons and evidence limitations. A hash mismatch or visual difference does not, by itself, prove malicious manipulation, intent, or false reporting. An exact match does not establish the truth of a report. Final conclusions require appropriate human review and supporting evidence.”
              </div>

            </div>
          </div>
        </div>
      )}

      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialData={modalInitialData}
        onComplete={() => showToast('Incident report saved to Evidence Vault')}
      />
    </div>
  );
}