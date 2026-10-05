import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { loadImageFile, compareImages } from '../utils/imageDiff';
import { hashFile, formatHash } from '../utils/hash';
import { saveEvidenceRecord } from '../services/evidenceStore';
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
  const [investigationId, setInvestigationId] = useState('');
  const [userNotes, setUserNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  const handleOpenReportModal = () => {
    if (!diffResults || !fileOrig || !fileSusp) {
      setErrorMsg('Please upload both images to run comparison before creating an incident report.');
      return;
    }

    setModalInitialData({
      defaultIncidentType: 'Image Manipulation Investigation',
      defaultDescription: `I found this image being circulated online and believe it may have been altered. Visual difference analysis detected a ${diffResults.diffPercent}% pixel delta between reference image "${fileOrig.name}" and suspected variant "${fileSusp.name}".`,
      platform: 'Online Platform',
      sourceModule: 'Image Investigation',
      originalContent: `Reference: ${fileOrig.name} | Suspected: ${fileSusp.name} | Difference: ${diffResults.diffPercent}%`,
      category: 'Image Manipulation Investigation',
      riskLevel: diffResults.diffPercent > 25 ? 'High' : (diffResults.diffPercent > 5 ? 'Medium' : 'Low'),
      riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
      reasons: [
        `Visual difference detected: ${diffResults.diffPercent}%`,
        `Mean Abs Difference (MAD): ${diffResults.mad}`,
        `PSNR: ${diffResults.psnr} dB`,
        `Changed regions count: ${diffResults.changedRegionsCount}`,
      ],
      thumbnailUrl: diffResults.thumbnailUrl,
      evidenceDetails: {
        summary: `Comparison of ${fileOrig.name} vs ${fileSusp.name} (${diffResults.diffPercent}% visual difference, MAD: ${diffResults.mad}, PSNR: ${diffResults.psnr} dB)`,
        origName: fileOrig.name,
        suspName: fileSusp.name,
        diffPercent: diffResults.diffPercent,
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

  // Initialize random case ID
  useEffect(() => {
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvestigationId(`INV-${nowStr}-${rand}`);
  }, []);

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

  // Run Image Comparison whenever images or threshold change
  useEffect(() => {
    if (imgOrigObj && imgSuspObj) {
      const res = compareImages(imgOrigObj, imgSuspObj, threshold);
      setDiffResults(res);
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
        incidentType: 'Image Investigation',
        title: `Image Investigation: ${fileOrig.name} vs ${fileSusp.name}`,
        content: `Difference Detected: ${diffResults.diffPercent}% | Threshold: ${threshold} | MAD: ${diffResults.mad} | PSNR: ${diffResults.psnr} dB | Orig SHA-256: ${hashOrig} | Variant SHA-256: ${hashSusp}`,
        category: 'Visual Difference',
        riskLevel: diffResults.diffPercent > 25 ? 'High' : diffResults.diffPercent > 5 ? 'Medium' : 'Low',
        riskScore: Math.min(100, Math.round(diffResults.diffPercent * 3)),
        source: `${fileOrig.name} vs ${fileSusp.name}`,
        notes: userNotes ? userNotes : `Computed visual difference of ${diffResults.diffPercent}%. Bounding regions: ${diffResults.changedRegionsCount}.`,
        thumbnailUrl: diffResults.thumbnailUrl,
      });

      showToast(`Investigation saved to Evidence Vault as Record ${record.id}`);
    } catch (err) {
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
                        <span class="font-label-md text-label-md text-primary uppercase font-semibold tracking-wider">Original Reference</span>
                      </div>
                      {fileOrig && (
                        <span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono">
                          {(fileOrig.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
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
                          <span class="font-body-sm text-body-sm text-on-surface-variant mt-1">Select authentic source image</span>
                        </div>
                      ) : (
                        <img 
                          src={URL.createObjectURL(fileOrig)} 
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
                      <div class="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
                        <span>{fileOrig.name} ({dimOrig.w} × {dimOrig.h} px)</span>
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
                          src={URL.createObjectURL(fileSusp)} 
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
                      <div class="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
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
                        
                        {/* Prominent Primary Metric Banner */}
                        <div class="p-space-md rounded bg-surface-container-low border border-surface-variant flex items-center justify-between">
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest block font-medium">
                                Pixel Difference Analysis
                              </span>
                              <span class={`text-xs px-2 py-0.5 rounded font-semibold font-mono ${diffResults.diffDetected ? 'bg-error-container/60 text-on-error-container' : 'bg-secondary-container/60 text-on-secondary-container'}`}>
                                {diffResults.statusText || (diffResults.diffDetected ? 'Images Differ' : 'Images Match')}
                              </span>
                            </div>
                            <div class="flex items-baseline gap-2 mt-1">
                              <div class="font-display-hero text-headline-lg text-primary tracking-tight font-normal leading-none">
                                {diffResults.diffPercent}%
                              </div>
                              <span class="font-label-md text-label-md text-on-surface-variant">
                                Changed Pixel Percentage (Match: {diffResults.matchPercent}%)
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
                      This analysis highlights visual differences. It does not by itself prove AI manipulation or establish authenticity.
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
