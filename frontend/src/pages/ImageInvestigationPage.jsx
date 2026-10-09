import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { loadImageFile, loadImageSource, compareImages } from '../utils/imageDiff';
import { hashFile, formatHash } from '../utils/hash';
import { saveEvidenceRecord, getEvidenceRecords } from '../services/evidenceStore';
import { 
  getPhotoDnaRecords, 
  getPhotoDnaRecordById, 
  getPhotoDnaRecordByHash, 
  registerPhotoDna 
} from '../services/photoDnaStore';
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
  const [investigationId, setInvestigationId] = useState(() => {
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${nowStr}-${rand}`;
  });
  const [userNotes, setUserNotes] = useState('');

  // Integrity Checker & Vault States
  const [savedVaultRecords, setSavedVaultRecords] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  const [integrityOutcome, setIntegrityOutcome] = useState(null);

  // Disputed Evidence Report Modal State
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Photo DNA State
  const [dnaRecords, setDnaRecords] = useState([]);
  const [selectedDnaId, setSelectedDnaId] = useState('');
  const [selectedDnaRecord, setSelectedDnaRecord] = useState(null);
  const [origPreviewUrl, setOrigPreviewUrl] = useState('');
  const [suspPreviewUrl, setSuspPreviewUrl] = useState('');

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  const inputOrigRef = useRef(null);
  const inputSuspRef = useRef(null);

  const exactHashMatch = Boolean(hashOrig && hashSusp && hashOrig.toLowerCase() === hashSusp.toLowerCase());

  // Initialize random case ID & Load Storage Records
  useEffect(() => {
    try {
      const records = getEvidenceRecords();
      setSavedVaultRecords(records || []);
    } catch (err) {
      console.error('Failed to load vault records:', err);
    }
    loadDnaRecords();
  }, []);

  const loadDnaRecords = async () => {
    try {
      const records = await getPhotoDnaRecords();
      setDnaRecords(records || []);
    } catch {
      console.warn('Could not load Photo DNA records from storage');
    }
  };

  // Determine Photo DNA / Integrity Verification Verdict
  const getVerdict = () => {
    if (!hashOrig) {
      return {
        category: 'Register or load reference first',
        detail: 'Select a registered Photo DNA / Vault record or upload an authentic reference image first to verify against.',
        badgeColor: 'bg-surface-container-low text-on-surface-variant border-surface-variant/80',
        icon: 'help_outline',
      };
    }
    if (!hashSusp || !diffResults) {
      return {
        category: 'Unable to verify — try another image',
        detail: 'Upload a suspected or modified variant image to run exact fingerprint comparison and visual difference analysis.',
        badgeColor: 'bg-surface-container-low text-on-surface-variant border-surface-variant/80',
        icon: 'pending',
      };
    }
    if (exactHashMatch) {
      return {
        category: 'Exact file match',
        detail: 'The cryptographic SHA-256 fingerprints match byte-for-byte. The uploaded image is identical to the registered original.',
        badgeColor: 'bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
        icon: 'verified',
      };
    }
    if (diffResults.diffPercent <= 5.0) {
      return {
        category: 'Visually similar, file differs',
        detail: `SHA-256 fingerprints differ, but visual analysis indicates high visual similarity (${diffResults.matchPercent}% match estimate). Different file hashes can result from legitimate re-encoding, compression, resizing, or format conversion.`,
        badgeColor: 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
        icon: 'tune',
      };
    }
    return {
      category: 'Visual differences detected',
      detail: `SHA-256 fingerprints differ and visual analysis detected changed pixel regions (${diffResults.diffPercent}% pixel difference across sensitivity threshold ${threshold}). A visual difference is not proof of malicious manipulation.`,
      badgeColor: 'bg-error-container/60 text-on-error-container border-error/30',
      icon: 'difference',
    };
  };

  const verdict = getVerdict();

  // Select a previously registered Photo DNA record
  const handleSelectDnaRecord = async (dnaId) => {
    setSelectedDnaId(dnaId);
    if (!dnaId) {
      setSelectedDnaRecord(null);
      setFileOrig(null);
      setImgOrigObj(null);
      setHashOrig('');
      setDimOrig({ w: 0, h: 0 });
      setOrigPreviewUrl('');
      return;
    }

    try {
      const record = await getPhotoDnaRecordById(dnaId);
      if (!record) {
        setErrorMsg('Selected Photo DNA record not found in storage.');
        return;
      }
      setSelectedDnaRecord(record);
      setHashOrig(record.sha256);
      setDimOrig(record.dimensions || { w: 0, h: 0 });

      const blob = record.imageBlob;
      const file = new File([blob], record.fileName, { type: record.fileType || 'image/png' });
      setFileOrig(file);

      const objUrl = URL.createObjectURL(blob);
      setOrigPreviewUrl(objUrl);

      const img = await loadImageSource(blob);
      setImgOrigObj(img);
      setDimOrig({ w: img.naturalWidth, h: img.naturalHeight });
      showToast(`Loaded Photo DNA record: ${record.fileName} (${record.id})`);
    } catch (err) {
      console.error('Failed to load registered Photo DNA image:', err);
      setErrorMsg('Failed to load registered Photo DNA image from storage.');
    }
  };

  // Handle Original File Upload
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
    const objUrl = URL.createObjectURL(file);
    setOrigPreviewUrl(objUrl);

    try {
      const hash = await hashFile(file);
      setHashOrig(hash);

      const match = await getPhotoDnaRecordByHash(hash);
      if (match) {
        setSelectedDnaId(match.id);
        setSelectedDnaRecord(match);
        showToast(`Recognized registered Photo DNA: ${match.id}`);
      } else {
        setSelectedDnaId('');
        setSelectedDnaRecord(null);
      }

      const img = await loadImageFile(file);
      setImgOrigObj(img);
      setDimOrig({ w: img.naturalWidth, h: img.naturalHeight });
    } catch (err) {
      console.error('Failed to process original image:', err);
      setErrorMsg('Failed to process image. Try another file.');
    }
  };

  // Register current uploaded original as Photo DNA
  const handleRegisterCurrentAsDna = async () => {
    if (!fileOrig || !hashOrig) {
      setErrorMsg('No authentic original image loaded to register.');
      return;
    }
    try {
      const record = await registerPhotoDna({
        file: fileOrig,
        imageObj: imgOrigObj,
        dimensions: dimOrig,
      });
      setSelectedDnaId(record.id);
      setSelectedDnaRecord(record);
      const list = await getPhotoDnaRecords();
      setDnaRecords(list);
      showToast(`Registered as Photo DNA: ${record.id}`);
    } catch (err) {
      if (err.existingRecord) {
        setSelectedDnaId(err.existingRecord.id);
        setSelectedDnaRecord(err.existingRecord);
        showToast(`Already registered under Photo DNA ID: ${err.existingRecord.id}`);
      } else {
        setErrorMsg(err.message || 'Failed to register Photo DNA');
      }
    }
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
    const objUrl = URL.createObjectURL(file);
    setSuspPreviewUrl(objUrl);

    try {
      const hash = await hashFile(file);
      setHashSusp(hash);

      const img = await loadImageFile(file);
      setImgSuspObj(img);
      setDimSusp({ w: img.naturalWidth, h: img.naturalHeight });
    } catch (err) {
      console.error('Failed to process suspected file:', err);
      setErrorMsg('Failed to process suspected file. Try another image.');
    }
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
      try {
        const res = compareImages(imgOrigObj, imgSuspObj, threshold);
        setDiffResults(res);
        evaluateIntegrityOutcome(res);
      } catch (err) {
        console.error('Failed to compare images:', err);
        setErrorMsg('Unable to verify images. Error during visual comparison.');
        setDiffResults(null);
      }
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

    if (hashOrig && hashSusp && hashOrig.toLowerCase() === hashSusp.toLowerCase()) {
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
        status: 'Exact Match (Visual)',
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
    setSelectedDnaId('');
    setSelectedDnaRecord(null);
    setOrigPreviewUrl('');
    setSuspPreviewUrl('');
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
        incidentType: selectedDnaId ? 'Photo DNA Verification' : 'Photo Integrity Check',
        title: selectedDnaId 
          ? `Photo DNA Verification: ${fileOrig ? fileOrig.name : 'Reference'} vs ${fileSusp.name}`
          : `Integrity Check: ${fileSusp ? fileSusp.name : 'Photo'} (${integrityOutcome?.status || verdict.category})`,
        content: `Outcome: ${integrityOutcome?.status || verdict.category} | Pixel Delta: ${diffResults ? diffResults.diffPercent : 0}% | Ref Hash: ${hashOrig || 'N/A'} | Suspected Hash: ${hashSusp}${selectedDnaId ? ` | Photo DNA ID: ${selectedDnaId}` : ''}`,
        category: selectedDnaId ? 'Photo DNA Verification' : 'Evidence Integrity',
        riskLevel: diffResults && diffResults.diffPercent > 25 ? 'High' : diffResults && diffResults.diffPercent > 5 ? 'Medium' : 'Low',
        riskScore: diffResults ? Math.min(100, Math.round(diffResults.diffPercent * 3)) : 0,
        source: fileOrig && fileSusp ? `${fileOrig.name} vs ${fileSusp.name}` : fileSusp ? `Suspected: ${fileSusp.name}` : 'Local Upload',
        notes: userNotes ? userNotes : `Integrity verification outcome: ${integrityOutcome?.status || verdict.category}. ${integrityOutcome?.details || verdict.detail}`,
        thumbnailUrl: diffResults ? diffResults.thumbnailUrl : null,
        sha256: hashSusp,
        evidenceDetails: {
          photoDnaId: selectedDnaId || null,
          verdictCategory: verdict.category,
          exactHashMatch,
          origName: fileOrig ? fileOrig.name : null,
          suspName: fileSusp ? fileSusp.name : null,
          diffPercent: diffResults ? diffResults.diffPercent : 0,
          matchPercent: diffResults ? diffResults.matchPercent : 0,
          mad: diffResults ? diffResults.mad : 0,
          psnr: diffResults ? diffResults.psnr : 0,
          origHash: hashOrig,
          suspHash: hashSusp,
        }
      });

      showToast(`Investigation saved to Evidence Vault as Record ${record.id}`);
    } catch (_err) {
      setErrorMsg('Failed to save investigation to Evidence Vault');
    }
  };

  const handleOpenReportModal = () => {
    if (!diffResults || !fileSusp) {
      setErrorMsg('Please upload images and run integrity check before creating a report.');
      return;
    }

    setModalInitialData({
      defaultIncidentType: selectedDnaId ? 'Photo DNA Verification' : 'Photo Integrity Investigation',
      defaultDescription: `Image integrity assessment performed on "${fileSusp.name}". Verification outcome: ${verdict.category} (${diffResults.diffPercent}% pixel delta).`,
      platform: 'Online Platform',
      sourceModule: selectedDnaId ? 'Photo DNA Verification' : 'Integrity Checker',
      originalContent: `Suspected: ${fileSusp.name} | SHA-256: ${hashSusp} | Ref SHA-256: ${hashOrig || 'None'} | Delta: ${diffResults.diffPercent}%`,
      category: selectedDnaId ? 'Photo DNA Verification' : 'Image Integrity Investigation',
      riskLevel: diffResults.diffPercent > 25 ? 'High' : diffResults.diffPercent > 5 ? 'Medium' : 'Low',
      riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
      reasons: [
        `Verification Verdict: ${verdict.category}`,
        `Exact SHA-256 Match: ${exactHashMatch ? 'YES' : 'NO'}`,
        `Visual similarity estimate: ${diffResults.matchPercent}% (Pixel delta: ${diffResults.diffPercent}%)`,
        `Mean Abs Difference (MAD): ${diffResults.mad}`,
        `PSNR: ${diffResults.psnr} dB`,
        selectedDnaId ? `Registered Photo DNA ID: ${selectedDnaId}` : 'Ad-hoc Reference',
      ],
      thumbnailUrl: diffResults.thumbnailUrl,
    });
    setIsReportModalOpen(true);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

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

                {/* Dual Upload / Reference Display Section */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                  
                  {/* Card 1: Original Source / Reference */}
                  <article className="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-variant/80">
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-variant/50 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">verified</span>
                        <span className="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">
                          Trusted Reference {selectedDnaId ? `(${selectedDnaId})` : ''}
                        </span>
                      </div>
                      {fileOrig && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono">
                          {(fileOrig.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    {/* Registered Photo DNA & Vault Selectors */}
                    <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-container-low border border-surface-variant/60 font-body-sm text-xs flex-wrap">
                      <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
                        <span className="material-symbols-outlined text-sm text-secondary">dna</span>
                        <span className="font-label-sm text-[0.6875rem] uppercase font-semibold">Photo DNA:</span>
                      </div>
                      <select
                        value={selectedDnaId}
                        onChange={(e) => handleSelectDnaRecord(e.target.value)}
                        className="bg-surface-container-lowest text-on-surface text-xs rounded px-2 py-1 border border-surface-variant/60 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                      >
                        <option value="">-- Choose Photo DNA repository --</option>
                        {dnaRecords.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.fileName} ({r.id})
                          </option>
                        ))}
                      </select>
                      {savedVaultRecords.length > 0 && (
                        <select 
                          value={selectedVaultId} 
                          onChange={(e) => handleSelectVaultReference(e.target.value)}
                          className="text-xs p-1 bg-surface-container-lowest rounded border border-surface-variant/60 text-on-surface focus:outline-none shrink-0"
                        >
                          <option value="">-- Load Vault --</option>
                          {savedVaultRecords.map(r => (
                            <option key={r.id} value={r.id}>{r.id} ({r.category || 'Record'})</option>
                          ))}
                        </select>
                      )}
                      {fileOrig && !selectedDnaId && (
                        <button
                          type="button"
                          onClick={handleRegisterCurrentAsDna}
                          className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-primary border border-surface-variant/60 rounded text-[0.6875rem] font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                          title="Register this image into Photo DNA repository"
                        >
                          <span className="material-symbols-outlined text-xs text-secondary">add_circle</span>
                          <span>Register DNA</span>
                        </button>
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
                          <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Select authentic source image or choose from Photo DNA above</span>
                        </div>
                      ) : (
                        <img 
                          src={origPreviewUrl || (fileOrig instanceof Blob ? URL.createObjectURL(fileOrig) : '')} 
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
                      <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-1">
                        <span>{fileOrig.name} ({dimOrig.w} × {dimOrig.h} px)</span>
                        {selectedDnaRecord && (
                          <span className="text-[0.6875rem] font-medium text-secondary">
                            Reg: {new Date(selectedDnaRecord.timestamp).toLocaleDateString()}
                          </span>
                        )}
                        <span className="font-mono text-[0.6875rem]">SHA-256: {formatHash(hashOrig)}</span>
                      </div>
                    )}
                  </article>

                  {/* Card 2: Suspected Image */}
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
                          src={suspPreviewUrl || (fileSusp instanceof Blob ? URL.createObjectURL(fileSusp) : '')} 
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
                      <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-1">
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
                        
                        {/* Verification Result Card */}
                        <div className={`p-space-md rounded-lg border flex flex-col gap-2.5 ${verdict.badgeColor} shadow-xs`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-secondary">{verdict.icon}</span>
                              <span className="font-label-sm text-xs uppercase font-bold tracking-wider text-primary">
                                Photo Verification Verdict
                              </span>
                            </div>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold font-mono uppercase tracking-wide bg-surface-container-lowest text-primary shadow-xs border border-surface-variant/60">
                              {verdict.category}
                            </span>
                          </div>

                          <p className="font-body-sm text-xs leading-relaxed text-on-surface">
                            {verdict.detail}
                          </p>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant/60 text-xs">
                            <div className="p-2 bg-surface-container-lowest/90 rounded border border-surface-variant/40 flex flex-col">
                              <span className="font-label-sm text-[0.625rem] text-on-surface-variant uppercase font-semibold">Exact-File Identity</span>
                              <span className="font-mono text-xs font-bold text-primary mt-0.5">
                                {exactHashMatch ? 'Exact Match' : 'Different Hashes'}
                              </span>
                            </div>
                            <div className="p-2 bg-surface-container-lowest/90 rounded border border-surface-variant/40 flex flex-col">
                              <span className="font-label-sm text-[0.625rem] text-on-surface-variant uppercase font-semibold">Visual Similarity</span>
                              <span className="font-mono text-xs font-bold text-primary mt-0.5">
                                {diffResults.matchPercent}% match ({diffResults.diffPercent}% delta)
                              </span>
                            </div>
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

                {/* Disclaimer Card */}
                <aside className="p-space-md rounded-lg bg-surface-container border border-surface-variant flex gap-space-sm items-start">
                  <span className="material-symbols-outlined text-outline mt-0.5 text-lg">info</span>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-label-md text-primary font-semibold uppercase tracking-wider">Analysis Disclaimer</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      This analysis highlights visual differences. It does not by itself prove AI manipulation or establish authenticity. Different file hashes can result from legitimate re-encoding, compression, resizing, or other changes. A visual difference is not proof of malicious manipulation, and high visual similarity is not proof of authenticity.
                    </p>
                  </div>
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
                  <div><strong className="text-gray-600">Reference File:</strong> {fileOrig ? fileOrig.name : (selectedVaultId ? `Vault Record #${selectedVaultId}` : (selectedDnaId ? `Photo DNA #${selectedDnaId}` : 'None Provided'))}</div>
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
                    <span className="font-semibold">{hashOrig ? (exactHashMatch ? 'Exact Match' : 'Hash Mismatch') : 'Reference Not Found'}</span>
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
                  {exactHashMatch && <li>Binary cryptographic hashes match 100% across both uploaded files.</li>}
                  {hashOrig && hashSusp && !exactHashMatch && <li>Binary cryptographic hashes differ between suspected and reference images.</li>}
                  {diffResults && diffResults.diffPercent > 0 && <li>Visual per-pixel difference analysis detected a {diffResults.diffPercent}% delta across {diffResults.changedRegionsCount} localized region(s).</li>}
                  {diffResults && diffResults.diffPercent === 0 && <li>Visual rendering analysis indicates 0% pixel delta between images.</li>}
                  {!fileOrig && !selectedVaultId && !selectedDnaId && <li>No trusted reference image or registered SHA-256 fingerprint was provided in local storage.</li>}
                  {selectedDnaId && <li>Authentic reference was verified against registered Photo DNA repository record #{selectedDnaId}.</li>}
                  <li>Findings reflect local canvas rendering calculations executed at sensitivity threshold {threshold}.</li>
                </ul>
              </div>

              {/* Section 4: Evidence Gaps */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-900 border-b border-amber-200 pb-1 mb-2 uppercase text-xs tracking-wider">4. Identified Evidence Gaps</h3>
                <ul className="list-disc pl-5 text-xs text-amber-900 flex flex-col gap-1">
                  {!fileOrig && !selectedVaultId && !selectedDnaId && <li>Original, unedited reference image is unavailable in local browser vault.</li>}
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
                  {verdict.category || currentStatus}
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