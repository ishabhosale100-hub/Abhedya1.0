import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { loadImageFile, loadImageSource, compareImages } from '../utils/imageDiff';
import { hashFile, formatHash } from '../utils/hash';
import { saveEvidenceRecord } from '../services/evidenceStore';
import { 
  getPhotoDnaRecords, 
  getPhotoDnaRecordById, 
  getPhotoDnaRecordByHash, 
  registerPhotoDna 
} from '../services/photoDnaStore';
import IncidentReportModal from '../components/IncidentReportModal';

export default function ImageInvestigationPage() {
  const navigate = useNavigate();

  // State
  const [fileOrig, setFileOrig] = useState(null);
  const [fileSusp, setFileSusp] = useState(null);

  const [imgOrigObj, setImgOrigObj] = useState(null);
  const [imgSuspObj, setImgSuspObj] = useState(null);

  const [hashOrig, setHashOrig] = useState('');
  const [hashSusp, setHashSusp] = useState('');

  const [dimOrig, setDimOrig] = useState({ w: 0, h: 0 });
  const [dimSusp, setDimSusp] = useState({ w: 0, h: 0 });

  const [threshold, setThreshold] = useState(30);
  const [activeTab, setActiveTab] = useState('diff'); // 'orig' | 'susp' | 'diff'

  const [diffResults, setDiffResults] = useState(null);
  const [investigationId, setInvestigationId] = useState(() => {
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${nowStr}-${rand}`;
  });
  const [userNotes, setUserNotes] = useState('');

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

  const exactHashMatch = Boolean(hashOrig && hashSusp && hashOrig.toLowerCase() === hashSusp.toLowerCase());

  // Determine Photo DNA Verification Verdict
  const getVerdict = () => {
    if (!hashOrig) {
      return {
        category: 'Register an original first',
        detail: 'Select a registered Photo DNA record or upload an authentic reference image first to verify against.',
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
    // High visual similarity threshold based on imageDiff match percentage (>= 95% match or <= 5% diff)
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

  const handleOpenReportModal = () => {
    if (!diffResults || !fileOrig || !fileSusp) {
      setErrorMsg('Please upload both images to run comparison before creating an incident report.');
      return;
    }

    setModalInitialData({
      defaultIncidentType: selectedDnaId ? 'Photo DNA Verification' : 'Image Manipulation Investigation',
      defaultDescription: `Photo DNA Verification Report: Category "${verdict.category}". Visual similarity estimate: ${diffResults.matchPercent}% (${diffResults.diffPercent}% pixel delta) between authentic reference image "${fileOrig.name}" (SHA-256: ${hashOrig}) and suspected variant "${fileSusp.name}" (SHA-256: ${hashSusp}). Notice: Different file hashes can result from legitimate compression, re-encoding, or editing; visual difference is not proof of malicious manipulation.`,
      platform: 'Online Platform',
      sourceModule: selectedDnaId ? 'Photo DNA Verification' : 'Image Investigation',
      originalContent: `Reference: ${fileOrig.name} (${formatHash(hashOrig)}) | Suspect: ${fileSusp.name} (${formatHash(hashSusp)}) | Result: ${verdict.category}`,
      category: selectedDnaId ? 'Photo DNA Verification' : 'Image Manipulation Investigation',
      riskLevel: diffResults.diffPercent > 25 ? 'High' : (diffResults.diffPercent > 5 ? 'Medium' : 'Low'),
      riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
      reasons: [
        `Verification Verdict: ${verdict.category}`,
        `Exact SHA-256 Match: ${exactHashMatch ? 'YES' : 'NO'}`,
        `Visual similarity estimate: ${diffResults.matchPercent}% (Pixel delta: ${diffResults.diffPercent}%)`,
        `Mean Abs Difference (MAD): ${diffResults.mad}`,
        `PSNR: ${diffResults.psnr} dB`,
        `Changed regions count: ${diffResults.changedRegionsCount}`,
        selectedDnaId ? `Registered Photo DNA ID: ${selectedDnaId}` : 'Ad-hoc Reference',
      ],
      thumbnailUrl: diffResults.thumbnailUrl,
      evidenceDetails: {
        summary: `Photo DNA Verification: ${verdict.category} (${diffResults.matchPercent}% visual similarity estimate, MAD: ${diffResults.mad}, PSNR: ${diffResults.psnr} dB)`,
        origName: fileOrig.name,
        suspName: fileSusp.name,
        photoDnaId: selectedDnaId || null,
        verdictCategory: verdict.category,
        exactHashMatch,
        diffPercent: diffResults.diffPercent,
        matchPercent: diffResults.matchPercent,
        mad: diffResults.mad,
        psnr: diffResults.psnr,
        origHash: hashOrig,
        suspHash: hashSusp,
      }
    });
    setIsReportModalOpen(true);
  };

  const inputOrigRef = useRef(null);
  const inputSuspRef = useRef(null);

  const loadDnaRecords = async () => {
    try {
      const records = await getPhotoDnaRecords();
      setDnaRecords(records);
    } catch {
      console.warn('Could not load Photo DNA records from storage');
    }
  };

  // Load registered Photo DNA records on mount
  useEffect(() => {
    loadDnaRecords();
  }, []);

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
    setFileOrig(file);
    const objUrl = URL.createObjectURL(file);
    setOrigPreviewUrl(objUrl);

    try {
      const hash = await hashFile(file);
      setHashOrig(hash);

      // Check if hash matches an existing Photo DNA registration
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

  // Run Image Comparison whenever images or threshold change
  useEffect(() => {
    if (imgOrigObj && imgSuspObj) {
      try {
        const res = compareImages(imgOrigObj, imgSuspObj, threshold);
        setDiffResults(res);
      } catch (err) {
        console.error('Failed to compare images:', err);
        setErrorMsg('Unable to verify images. Error during visual comparison.');
        setDiffResults(null);
      }
    } else {
      setDiffResults(null);
    }
  }, [imgOrigObj, imgSuspObj, threshold]);

  // Reset comparison
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
    setUserNotes('');
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvestigationId(`INV-${nowStr}-${rand}`);
  };

  // Save Investigation to Vault
  const handleSaveInvestigation = async () => {
    if (!diffResults || !fileOrig || !fileSusp) {
      setErrorMsg('Please upload both images to run comparison before saving.');
      return;
    }

    try {
      const record = await saveEvidenceRecord({
        id: investigationId,
        incidentType: selectedDnaId ? 'Photo DNA Verification' : 'Image Investigation',
        title: selectedDnaId 
          ? `Photo DNA Verification: ${fileOrig.name} vs ${fileSusp.name}`
          : `Image Investigation: ${fileOrig.name} vs ${fileSusp.name}`,
        content: `Verdict: ${verdict.category} | Visual Match Estimate: ${diffResults.matchPercent}% | Pixel Delta: ${diffResults.diffPercent}% | Threshold: ${threshold} | Orig SHA-256: ${hashOrig} | Variant SHA-256: ${hashSusp}${selectedDnaId ? ` | Photo DNA ID: ${selectedDnaId}` : ''}`,
        category: selectedDnaId ? 'Photo DNA Verification' : 'Visual Difference',
        riskLevel: diffResults.diffPercent > 25 ? 'High' : (diffResults.diffPercent > 5 ? 'Medium' : 'Low'),
        riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
        source: `${fileOrig.name} vs ${fileSusp.name}`,
        notes: userNotes ? userNotes : `Computed visual similarity estimate of ${diffResults.matchPercent}%. Bounding regions: ${diffResults.changedRegionsCount}.${selectedDnaId ? ` Verified against Photo DNA record ${selectedDnaId}.` : ''}`,
        thumbnailUrl: diffResults.thumbnailUrl,
        sha256: hashSusp,
        evidenceDetails: {
          photoDnaId: selectedDnaId || null,
          verdictCategory: verdict.category,
          exactHashMatch,
          origName: fileOrig.name,
          suspName: fileSusp.name,
          diffPercent: diffResults.diffPercent,
          matchPercent: diffResults.matchPercent,
          mad: diffResults.mad,
          psnr: diffResults.psnr,
          origHash: hashOrig,
          suspHash: hashSusp,
        }
      });

      showToast(`Investigation saved to Evidence Vault as Record ${record.id}`);
    } catch (_err) {
      setErrorMsg('Failed to save investigation to Evidence Vault');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div class="pl-64">
        <main class="w-full pt-16 bg-surface min-h-screen">
          <div class="w-full px-margin py-space-lg">
            <div class="grid grid-cols-12 gap-gutter w-full">
              <div class="flex flex-col w-full col-span-12 gap-space-lg">
                
                {/* Header */}
                <header class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-variant">
                  <div class="flex flex-col gap-space-xs">
                    <button 
                      onClick={() => navigate('/workspace')}
                      class="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-body-sm text-body-sm w-fit cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Back to workspace</span>
                    </button>
                    <div class="flex items-baseline gap-space-md mt-1 flex-wrap">
                      <h1 class="font-headline-md text-headline-md text-primary tracking-tight">Image Investigation</h1>
                      <span class="font-label-sm text-label-sm text-secondary bg-secondary-container/40 px-2.5 py-0.5 rounded font-mono">
                        CASE #{investigationId}
                      </span>
                    </div>
                    <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                      Compare an authentic reference source with a suspected variant image using per-pixel delta analysis and heatmap overlays.
                    </p>
                  </div>

                  {/* Mode Switcher Tabs */}
                  <div class="flex items-center p-1 bg-surface-container rounded border border-surface-variant self-start md:self-end">
                    <button 
                      onClick={() => setActiveTab('orig')}
                      class={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all cursor-pointer ${
                        activeTab === 'orig' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Original Reference
                    </button>
                    <button 
                      onClick={() => setActiveTab('susp')}
                      class={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all cursor-pointer ${
                        activeTab === 'susp' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Suspected Variant
                    </button>
                    <button 
                      onClick={() => setActiveTab('diff')}
                      class={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all cursor-pointer ${
                        activeTab === 'diff' ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Visual Difference
                    </button>
                  </div>
                </header>

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

                {/* Dual Upload / Reference Display Section */}
                <section class="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                  
                  {/* Card 1: Original Source */}
                  <article class="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-variant/80">
                    <div class="flex items-center justify-between pb-space-xs border-b border-surface-variant/50">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-secondary text-base">verified</span>
                        <span class="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">
                          Original Reference {selectedDnaId ? `(${selectedDnaId})` : ''}
                        </span>
                      </div>
                      {fileOrig && (
                        <span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono">
                          {(fileOrig.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    {/* Registered Photo DNA Quick Selector */}
                    <div class="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-container-low border border-surface-variant/60 font-body-sm text-xs">
                      <div class="flex items-center gap-1 text-on-surface-variant shrink-0">
                        <span class="material-symbols-outlined text-sm text-secondary">dna</span>
                        <span class="font-label-sm text-[0.6875rem] uppercase font-semibold">Photo DNA:</span>
                      </div>
                      <select
                        value={selectedDnaId}
                        onChange={(e) => handleSelectDnaRecord(e.target.value)}
                        class="bg-surface-container-lowest text-on-surface text-xs rounded px-2 py-1 border border-surface-variant/60 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                      >
                        <option value="">-- Choose registered Photo DNA --</option>
                        {dnaRecords.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.fileName} ({r.id})
                          </option>
                        ))}
                      </select>
                      {fileOrig && !selectedDnaId && (
                        <button
                          type="button"
                          onClick={handleRegisterCurrentAsDna}
                          class="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-primary border border-surface-variant/60 rounded text-[0.6875rem] font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                          title="Register this image into Photo DNA repository"
                        >
                          <span class="material-symbols-outlined text-xs text-secondary">add_circle</span>
                          <span>Register</span>
                        </button>
                      )}
                    </div>

                    <div class="relative aspect-square w-full rounded overflow-hidden bg-surface-container flex items-center justify-center border border-surface-variant/60">
                      {!fileOrig ? (
                        <div 
                          onClick={() => inputOrigRef.current?.click()}
                          class="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-surface-container-high transition-colors w-full h-full"
                        >
                          <span class="material-symbols-outlined text-3xl text-secondary mb-2">upload_file</span>
                          <span class="font-title-sm text-title-sm text-primary font-semibold">Upload Original Reference</span>
                          <span class="font-body-sm text-body-sm text-on-surface-variant mt-1">Select authentic source image or choose from Photo DNA above</span>
                        </div>
                      ) : (
                        <img 
                          src={origPreviewUrl || (fileOrig instanceof Blob ? URL.createObjectURL(fileOrig) : '')} 
                          alt="Original reference" 
                          class="w-full h-full object-contain"
                        />
                      )}
                      <input 
                        ref={inputOrigRef}
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        class="hidden" 
                        onChange={(e) => handleOrigUpload(e.target.files[0])}
                      />
                    </div>

                    {fileOrig && (
                      <div class="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-1">
                        <span>{fileOrig.name} ({dimOrig.w} × {dimOrig.h} px)</span>
                        {selectedDnaRecord && (
                          <span class="text-[0.6875rem] font-medium text-secondary">
                            Reg: {new Date(selectedDnaRecord.timestamp).toLocaleDateString()}
                          </span>
                        )}
                        <span class="font-mono text-[0.6875rem]">SHA-256: {formatHash(hashOrig)}</span>
                      </div>
                    )}
                  </article>

                  {/* Card 2: Suspected Variant */}
                  <article class="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-variant/80">
                    <div class="flex items-center justify-between pb-space-xs border-b border-surface-variant/50">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-error text-base">warning</span>
                        <span class="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">Suspected Variant</span>
                      </div>
                      {fileSusp && (
                        <span class="font-label-sm text-label-sm text-error bg-error-container/40 px-2 py-0.5 rounded font-mono font-medium">
                          {(fileSusp.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    <div class="relative aspect-square w-full rounded overflow-hidden bg-surface-container flex items-center justify-center border border-surface-variant/60">
                      {!fileSusp ? (
                        <div 
                          onClick={() => inputSuspRef.current?.click()}
                          class="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-surface-container-high transition-colors w-full h-full"
                        >
                          <span class="material-symbols-outlined text-3xl text-secondary mb-2">find_in_page</span>
                          <span class="font-title-sm text-title-sm text-primary font-semibold">Upload Suspected Variant</span>
                          <span class="font-body-sm text-body-sm text-on-surface-variant mt-1">Select variant image to compare</span>
                        </div>
                      ) : (
                        <img 
                          src={suspPreviewUrl || (fileSusp instanceof Blob ? URL.createObjectURL(fileSusp) : '')} 
                          alt="Suspected variant" 
                          class="w-full h-full object-contain"
                        />
                      )}
                      <input 
                        ref={inputSuspRef}
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        class="hidden" 
                        onChange={(e) => handleSuspUpload(e.target.files[0])}
                      />
                    </div>

                    {fileSusp && (
                      <div class="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-1">
                        <span>{fileSusp.name} ({dimSusp.w} × {dimSusp.h} px)</span>
                        <span class="font-mono text-[0.6875rem]">SHA-256: {formatHash(hashSusp)}</span>
                      </div>
                    )}
                  </article>

                </section>

                {/* Heatmap & Real Computed Analytical Engine */}
                {diffResults && (
                  <section class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                    
                    {/* Differential Heatmap Viewport (7 Cols) */}
                    <div class="lg:col-span-7 bg-surface-container-lowest rounded-lg p-space-md shadow-sm border border-surface-variant/80 flex flex-col gap-space-md">
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-surface-variant/50">
                        <div>
                          <h2 class="font-title-md text-title-md text-primary">Visual Difference Heatmap</h2>
                          <span class="font-label-sm text-label-sm text-on-surface-variant">Per-pixel delta contour rendering with changed region highlights</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                          <span class="font-label-sm text-label-sm text-secondary font-medium">Computed Overlay</span>
                        </div>
                      </div>

                      {/* Rendered Heatmap Thumbnail Display */}
                      <div class="relative aspect-square w-full rounded overflow-hidden bg-primary-container flex items-center justify-center border border-surface-variant/60">
                        <img 
                          src={diffResults.thumbnailUrl} 
                          alt="Per-pixel visual difference heatmap" 
                          class="w-full h-full object-contain"
                        />

                        {/* Threshold Slider Bar Overlay */}
                        <div class="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 rounded bg-surface/90 backdrop-blur-md border border-surface-variant/60">
                          <div class="flex items-center gap-2 w-full sm:w-auto">
                            <span class="material-symbols-outlined text-primary text-base">tune</span>
                            <span class="font-label-sm text-label-sm text-on-surface whitespace-nowrap">Threshold Filter:</span>
                            <span class="font-label-sm text-label-sm font-mono text-primary font-semibold">{threshold}</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="100"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            class="w-full sm:w-36 h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>

                      {/* Real Computed Metrics Strip */}
                      <div class="grid grid-cols-3 gap-space-sm pt-space-xs text-center border-t border-surface-variant/40 font-label-sm">
                        <div class="p-2 bg-surface-container rounded">
                          <span class="block text-on-surface-variant text-[0.6875rem]">Visual Difference Detected</span>
                          <span class={`font-semibold text-label-md ${diffResults.diffDetected ? 'text-error' : 'text-secondary'}`}>
                            {diffResults.diffDetected ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div class="p-2 bg-surface-container rounded">
                          <span class="block text-on-surface-variant text-[0.6875rem]">Mean Abs Diff (MAD)</span>
                          <span class="font-semibold text-primary font-mono">{diffResults.mad}</span>
                        </div>
                        <div class="p-2 bg-surface-container rounded">
                          <span class="block text-on-surface-variant text-[0.6875rem]">Peak SNR (PSNR)</span>
                          <span class="font-semibold text-primary font-mono">{diffResults.psnr} dB</span>
                        </div>
                      </div>
                    </div>

                    {/* Analytical Metrics Panel (5 Cols) */}
                    <div class="lg:col-span-5 flex flex-col gap-space-md">
                      <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm border border-surface-variant/80 flex flex-col gap-space-md">
                        
                        {/* Photo DNA Verification Result Card */}
                        <div class={`p-space-md rounded-lg border flex flex-col gap-2.5 ${verdict.badgeColor} shadow-xs`}>
                          <div class="flex items-center justify-between flex-wrap gap-2">
                            <div class="flex items-center gap-2">
                              <span class="material-symbols-outlined text-lg text-secondary">{verdict.icon}</span>
                              <span class="font-label-sm text-xs uppercase font-bold tracking-wider text-primary">
                                Photo DNA Verification Result
                              </span>
                            </div>
                            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold font-mono uppercase tracking-wide bg-surface-container-lowest text-primary shadow-xs border border-surface-variant/60">
                              {verdict.category}
                            </span>
                          </div>

                          <p class="font-body-sm text-xs leading-relaxed text-on-surface">
                            {verdict.detail}
                          </p>

                          {/* Cryptographic identity vs Visual similarity distinction */}
                          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-surface-variant/60 text-xs">
                            <div class="p-2 bg-surface-container-lowest/90 rounded border border-surface-variant/40 flex flex-col">
                              <span class="font-label-sm text-[0.625rem] text-on-surface-variant uppercase font-semibold">Exact-File Identity</span>
                              <span class="font-mono text-xs font-bold text-primary mt-0.5">
                                {exactHashMatch ? 'Exact Match (Identical Bytes)' : 'Different File Bytes'}
                              </span>
                            </div>
                            <div class="p-2 bg-surface-container-lowest/90 rounded border border-surface-variant/40 flex flex-col">
                              <span class="font-label-sm text-[0.625rem] text-on-surface-variant uppercase font-semibold">Visual Similarity Estimate</span>
                              <span class="font-mono text-xs font-bold text-primary mt-0.5">
                                {diffResults.matchPercent}% match ({diffResults.diffPercent}% delta)
                              </span>
                            </div>
                          </div>

                          {/* Technical notice */}
                          <p class="font-body-sm text-[0.6875rem] text-on-surface-variant italic leading-normal">
                            Note: Different file hashes can result from legitimate re-encoding, compression, or resizing. Visual difference does not prove malicious manipulation, and visual similarity does not prove authenticity.
                          </p>
                        </div>

                        {/* Prominent Primary Metric Banner */}
                        <div class="p-space-md rounded bg-surface-container-low border border-surface-variant flex items-center justify-between">
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest block font-medium">
                                Visual Similarity Estimate
                              </span>
                              <span class={`text-xs px-2 py-0.5 rounded font-semibold font-mono ${diffResults.diffDetected ? 'bg-error-container/60 text-on-error-container' : 'bg-secondary-container/60 text-on-secondary-container'}`}>
                                {diffResults.statusText || (diffResults.diffDetected ? 'Images Differ' : 'Images Match')}
                              </span>
                            </div>
                            <div class="flex items-baseline gap-2 mt-1">
                              <div class="font-display-hero text-headline-lg text-primary tracking-tight font-normal leading-none">
                                {diffResults.matchPercent}%
                              </div>
                              <span class="font-label-md text-label-md text-on-surface-variant">
                                Visual Match (Pixel delta: {diffResults.diffPercent}%)
                              </span>
                            </div>
                            <span class="font-body-sm text-body-sm text-on-surface-variant mt-1 block">
                              {diffResults.diffDetected 
                                ? `Visual difference detected across ${diffResults.diffPercent}% of pixels exceeding threshold ${threshold}.`
                                : 'Images Match: Both files contain identical pixel data (0% difference, 100% match).'}
                            </span>
                          </div>
                          <div class="w-14 h-14 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary flex-shrink-0">
                            <span class="material-symbols-outlined text-3xl">
                              {diffResults.diffDetected ? 'contrast' : 'check_circle'}
                            </span>
                          </div>
                        </div>

                        {/* Region Bounding Box Breakdown */}
                        <div class="flex flex-col gap-space-sm border-t border-surface-variant/40 pt-space-sm">
                          <span class="font-label-md text-label-md text-primary font-semibold uppercase tracking-wider">
                            Detected Change Regions ({diffResults.changedRegionsCount})
                          </span>
                          
                          {diffResults.regions.length === 0 ? (
                            <p class="font-body-sm text-body-sm text-on-surface-variant italic">
                              No major localized changed regions detected above threshold {threshold}.
                            </p>
                          ) : (
                            <div class="flex flex-col gap-2">
                              {diffResults.regions.map((reg, idx) => (
                                <div key={idx} class="p-2.5 bg-surface-container-low rounded border border-surface-variant/60 flex items-center justify-between text-xs font-mono">
                                  <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-error"></span>
                                    <span class="font-semibold text-primary">Changed region {idx + 1}</span>
                                  </div>
                                  <span class="text-on-surface-variant">Box: ({reg.x}, {reg.y}) {reg.w}×{reg.h}px</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Notes input */}
                        <div class="flex flex-col gap-1.5 border-t border-surface-variant/40 pt-space-sm">
                          <label class="font-label-sm text-label-sm text-on-surface font-medium uppercase tracking-wider" htmlFor="user-notes">
                            Investigation Notes
                          </label>
                          <textarea 
                            id="user-notes"
                            rows="2"
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            class="w-full p-2.5 bg-surface-container-low rounded text-body-sm text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-surface-variant/60"
                            placeholder="Add analytical context or notes before saving..."
                          />
                        </div>

                      </div>
                    </div>

                  </section>
                )}

                {/* ALWAYS VISIBLE Disclaimer Card with EXACT Prompt Text */}
                <aside class="p-space-md rounded-lg bg-surface-container border border-surface-variant flex gap-space-sm items-start">
                  <span class="material-symbols-outlined text-outline mt-0.5 text-lg">info</span>
                  <div class="flex flex-col gap-1">
                    <span class="font-label-md text-label-md text-primary font-semibold uppercase tracking-wider">Analysis Disclaimer</span>
                    <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      This analysis highlights visual differences. It does not by itself prove AI manipulation or establish authenticity. Different file hashes can result from legitimate re-encoding, compression, resizing, or other changes. A visual difference is not proof of malicious manipulation, and high visual similarity is not proof of authenticity.
                    </p>
                  </div>
                </aside>

                {/* Action Control Bar */}
                <footer class="flex flex-col sm:flex-row items-center justify-between gap-space-md p-space-md bg-surface-container-lowest rounded-lg border border-surface-variant shadow-sm mb-space-xl">
                  <div class="flex items-center gap-space-sm text-on-surface-variant">
                    <span class="material-symbols-outlined text-secondary text-xl">fact_check</span>
                    <div>
                      <span class="font-label-md text-label-md text-primary font-medium block">Investigation Control</span>
                      <span class="font-label-sm text-label-sm text-outline block">Local canvas comparison engine</span>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-space-sm w-full sm:w-auto justify-end">
                    <button 
                      type="button"
                      onClick={handleReset}
                      class="px-space-md py-2.5 rounded font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-variant/60"
                    >
                      <span class="material-symbols-outlined text-base">refresh</span>
                      <span>Run New Comparison</span>
                    </button>

                    <button 
                      type="button"
                      onClick={handleSaveInvestigation}
                      disabled={!diffResults}
                      class="px-space-md py-2.5 rounded bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-2 border border-surface-variant/60 cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-base text-secondary">save</span>
                      <span>Save Investigation</span>
                    </button>

                    <button 
                      type="button"
                      onClick={handleOpenReportModal}
                      disabled={!diffResults}
                      class="px-space-lg py-2.5 rounded bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-2 shadow hover:shadow-md cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-base">description</span>
                      <span>Create Incident Report</span>
                    </button>
                  </div>
                </footer>

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
