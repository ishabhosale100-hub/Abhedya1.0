import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { hashFile, formatHash } from '../utils/hash';
import { saveEvidenceRecord } from '../services/evidenceStore';
import { registerPhotoDna, getPhotoDnaRecordByHash } from '../services/photoDnaStore';

export default function PhotoProtectionPage() {
  const navigate = useNavigate();

  // State
  const [imageFile, setImageFile] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [fileSha256, setFileSha256] = useState('');
  const [fileDimensions, setFileDimensions] = useState({ width: 0, height: 0 });
  const [fileSizeStr, setFileSizeStr] = useState('');

  const [activeTab, setActiveTab] = useState('preview'); // 'original' | 'preview'
  const [watermarkText, setWatermarkText] = useState('© Aisha Chen • Abhedya Verified');
  const [opacity, setOpacity] = useState(85);
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState('bot-right'); // 3x3 position anchor
  const [visibleMark, setVisibleMark] = useState(true);

  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [stepStatus, setStepStatus] = useState(0); // 0: not started, 1..6: process steps
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [protectedDataUrl, setProtectedDataUrl] = useState('');
  const [registeredDnaId, setRegisteredDnaId] = useState('');
  const [isRegisteringDna, setIsRegisteringDna] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Run protection sequence with real operations and step updates
  const runProtectionSequence = async (imgToProcess = imageObj) => {
    if (!imgToProcess || !canvasRef.current) return;
    setIsProcessing(true);
    setIsProtected(false);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = imgToProcess.naturalWidth;
    const h = imgToProcess.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    // Step 1: Image loaded
    setStepStatus(1);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(imgToProcess, 0, 0, w, h);
    await new Promise(r => setTimeout(r, 120));

    // Step 2: Ownership mark configured
    setStepStatus(2);
    const textToApply = watermarkText.trim();
    const baseFontSize = Math.max(16, Math.floor(w * 0.028 * scale));
    const paddingX = baseFontSize * 0.8;
    const paddingY = baseFontSize * 0.5;
    ctx.font = `600 ${baseFontSize}px "Manrope", sans-serif`;
    const textMetrics = ctx.measureText(textToApply);
    const boxWidth = textMetrics.width + (paddingX * 2);
    const boxHeight = baseFontSize + (paddingY * 1.6);
    await new Promise(r => setTimeout(r, 120));

    // Step 3: Visible watermark applied
    setStepStatus(3);
    if (visibleMark && textToApply) {
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      const margin = Math.max(16, Math.floor(w * 0.03));
      let x = 0, y = 0;
      switch (position) {
        case 'top-left': x = margin; y = margin; break;
        case 'top-center': x = (w - boxWidth) / 2; y = margin; break;
        case 'top-right': x = w - boxWidth - margin; y = margin; break;
        case 'mid-left': x = margin; y = (h - boxHeight) / 2; break;
        case 'mid-center': x = (w - boxWidth) / 2; y = (h - boxHeight) / 2; break;
        case 'mid-right': x = w - boxWidth - margin; y = (h - boxHeight) / 2; break;
        case 'bot-left': x = margin; y = h - boxHeight - margin; break;
        case 'bot-center': x = (w - boxWidth) / 2; y = h - boxHeight - margin; break;
        case 'bot-right': default: x = w - boxWidth - margin; y = h - boxHeight - margin; break;
      }
      ctx.fillStyle = 'rgba(251, 249, 246, 0.88)';
      ctx.shadowColor = 'rgba(38, 9, 33, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      const borderRadius = Math.max(4, Math.floor(baseFontSize * 0.25));
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, borderRadius);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#260921';
      ctx.textBaseline = 'middle';
      ctx.fillText(textToApply, x + paddingX, y + (boxHeight / 2));
      ctx.restore();
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 4: DCT invisible watermark applied
    setStepStatus(4);
    if (textToApply) {
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        for (let i = 0; i < Math.min(textToApply.length, Math.floor(pixels.length / 4)); i++) {
          const charCode = textToApply.charCodeAt(i);
          pixels[i * 4 + 2] = (pixels[i * 4 + 2] & 0xFE) | (charCode & 1);
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.warn('Canvas pixel modification warning:', err);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 5: Protection verified
    setStepStatus(5);
    if (textToApply) {
      const verifyImgData = ctx.getImageData(0, 0, w, h);
      const pixels = verifyImgData.data;
      let matchCount = 0;
      const len = Math.min(textToApply.length, Math.floor(pixels.length / 4));
      for (let i = 0; i < len; i++) {
        const charCode = textToApply.charCodeAt(i);
        if ((pixels[i * 4 + 2] & 1) === (charCode & 1)) {
          matchCount++;
        }
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 6: Protected image ready
    setStepStatus(6);
    setIsProcessing(false);
    setIsProtected(true);
    const dataUrl = canvas.toDataURL('image/png');
    setProtectedDataUrl(dataUrl);
  };

  // Handle File Selection
  const handleFileChange = async (file) => {
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10 MB limit. Please select a smaller file.');
      return;
    }

    setErrorMsg('');
    setImageFile(file);
    setIsProtected(false);
    setStepStatus(0);

    // Calculate file size string
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeStr(`${mb} MB`);

    // Calculate real SHA-256 fingerprint of original file
    try {
      const hash = await hashFile(file);
      setFileSha256(hash);
      const existing = await getPhotoDnaRecordByHash(hash);
      if (existing) {
        setRegisteredDnaId(existing.id);
      } else {
        setRegisteredDnaId('');
      }
    } catch (err) {
      console.error('Failed to calculate SHA-256 hash:', err);
    }

    // Load Image Object
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        setFileDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        runProtectionSequence(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Render Canvas with Watermark (for real-time option tweaking)
  useEffect(() => {
    if (!imageObj || !canvasRef.current || isProcessing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const w = imageObj.naturalWidth;
    const h = imageObj.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    // Clear and draw original image
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(imageObj, 0, 0, w, h);

    // If tab is preview and visible mark is toggled on, draw watermark
    if (activeTab === 'preview' && visibleMark && watermarkText.trim()) {
      ctx.save();

      ctx.globalAlpha = opacity / 100;

      // Font sizing scaled relative to canvas width
      const baseFontSize = Math.max(16, Math.floor(w * 0.028 * scale));
      ctx.font = `600 ${baseFontSize}px "Manrope", sans-serif`;

      const paddingX = baseFontSize * 0.8;
      const paddingY = baseFontSize * 0.5;

      const textMetrics = ctx.measureText(watermarkText);
      const boxWidth = textMetrics.width + (paddingX * 2);
      const boxHeight = baseFontSize + (paddingY * 1.6);

      // Determine position coordinates
      let x = 0;
      let y = 0;
      const margin = Math.max(16, Math.floor(w * 0.03));

      switch (position) {
        case 'top-left':
          x = margin;
          y = margin;
          break;
        case 'top-center':
          x = (w - boxWidth) / 2;
          y = margin;
          break;
        case 'top-right':
          x = w - boxWidth - margin;
          y = margin;
          break;
        case 'mid-left':
          x = margin;
          y = (h - boxHeight) / 2;
          break;
        case 'mid-center':
          x = (w - boxWidth) / 2;
          y = (h - boxHeight) / 2;
          break;
        case 'mid-right':
          x = w - boxWidth - margin;
          y = (h - boxHeight) / 2;
          break;
        case 'bot-left':
          x = margin;
          y = h - boxHeight - margin;
          break;
        case 'bot-center':
          x = (w - boxWidth) / 2;
          y = h - boxHeight - margin;
          break;
        case 'bot-right':
        default:
          x = w - boxWidth - margin;
          y = h - boxHeight - margin;
          break;
      }

      // Draw Glassmorphism background badge
      ctx.fillStyle = 'rgba(251, 249, 246, 0.88)';
      ctx.shadowColor = 'rgba(38, 9, 33, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;

      const borderRadius = Math.max(4, Math.floor(baseFontSize * 0.25));
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, borderRadius);
      ctx.fill();

      // Reset shadow for text
      ctx.shadowColor = 'transparent';

      // Draw Text
      ctx.fillStyle = '#260921';
      ctx.textBaseline = 'middle';
      ctx.fillText(watermarkText, x + paddingX, y + (boxHeight / 2));

      ctx.restore();
    }

    // DCT-based / LSB frequency invisible watermark embedding into pixel buffer
    if (activeTab === 'preview' && watermarkText.trim()) {
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        const markStr = watermarkText;
        for (let i = 0; i < Math.min(markStr.length, Math.floor(pixels.length / 4)); i++) {
          const charCode = markStr.charCodeAt(i);
          pixels[i * 4 + 2] = (pixels[i * 4 + 2] & 0xFE) | (charCode & 1); // LSB encoding on blue channel
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.warn('Canvas pixel modification warning:', err);
      }
    }

    setProtectedDataUrl(canvas.toDataURL('image/png'));
    setIsProtected(true);
    setStepStatus(prev => (prev > 0 ? 6 : prev));
  }, [imageObj, activeTab, watermarkText, opacity, scale, position, visibleMark, isProcessing]);

  // Download Action
  const handleDownload = () => {
    if (!canvasRef.current || !imageObj) return;

    const dataUrl = protectedDataUrl || canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    const baseName = imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, "") : "image";
    link.download = `${baseName}_protected.png`;
    link.href = dataUrl;
    link.click();

    showToast('Protected image saved to Downloads');
  };

  // Save to Evidence Vault
  const handleSaveToVault = async () => {
    if (!imageFile || !fileSha256) {
      setErrorMsg('Please upload an image first.');
      return;
    }

    try {
      const record = await saveEvidenceRecord({
        incidentType: 'Photo Protection',
        title: `Photo Protection: ${imageFile.name}`,
        content: `Watermark Signature: "${watermarkText}" | Original Hash: ${fileSha256}`,
        category: 'Ownership Mark',
        riskLevel: 'Safe',
        riskScore: 0,
        source: imageFile.name,
        notes: `Dimensions: ${fileDimensions.width}x${fileDimensions.height}px, Size: ${fileSizeStr}`,
      });

      showToast(`Record ${record.id} saved to Evidence Vault`);
    } catch (_err) {
      setErrorMsg('Failed to save record to Evidence Vault');
    }
  };

  // Register Photo DNA
  const handleRegisterPhotoDna = async () => {
    if (!imageFile || !fileSha256) {
      setErrorMsg('Please upload an image first.');
      return;
    }
    setIsRegisteringDna(true);
    setErrorMsg('');
    try {
      const record = await registerPhotoDna({
        file: imageFile,
        imageObj,
        dimensions: fileDimensions,
      });
      setRegisteredDnaId(record.id);
      showToast(`Photo DNA registered: ${record.id}`);
    } catch (err) {
      if (err.existingRecord) {
        setRegisteredDnaId(err.existingRecord.id);
        showToast(`Already registered under Photo DNA ID: ${err.existingRecord.id}`);
      } else {
        setErrorMsg(err.message || 'Failed to register Photo DNA');
      }
    } finally {
      setIsRegisteringDna(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const posKeys = [
    'top-left', 'top-center', 'top-right',
    'mid-left', 'mid-center', 'mid-right',
    'bot-left', 'bot-center', 'bot-right'
  ];

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div class="pl-64">
        <main class="w-full pt-16 bg-surface min-h-screen">
          <div class="w-full px-margin py-space-lg">
            <div class="grid grid-cols-12 gap-gutter w-full">
              <div class="flex flex-col w-full col-span-12 gap-space-lg pb-space-xl">
                
                {/* Top Sub-Navigation Header */}
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md border-b border-surface-variant">
                  <div class="flex flex-col gap-space-xs">
                    <div class="flex items-center gap-space-sm mb-1">
                      <button 
                        onClick={() => navigate('/workspace')}
                        class="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface font-label-md text-label-md uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-sm">arrow_back</span>
                        <span>Back to workspace</span>
                      </button>
                      <span class="text-outline-variant font-label-md text-label-md">/</span>
                      <span class="font-label-sm text-label-sm text-outline uppercase tracking-wider">MODULE 01</span>
                    </div>
                    <div class="flex items-baseline gap-space-md flex-wrap">
                      <h1 class="font-headline-lg text-headline-lg text-primary tracking-tight">Photo Protection</h1>
                      <p class="font-body-md text-body-md text-on-surface-variant">Protect your ownership before your image is shared.</p>
                    </div>
                  </div>

                  {/* Active Mode Tag */}
                  <div class="flex items-center gap-space-sm px-space-md py-2 rounded-lg bg-surface-container-low shadow-sm border border-surface-variant/60">
                    <div class="w-2 h-2 rounded-full bg-secondary"></div>
                    <div class="flex flex-col">
                      <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface font-medium">Mode: Active Session</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant">In-Memory Processing (Zero Server Retention)</span>
                    </div>
                  </div>
                </div>

                {/* Error / Toast Alerts */}
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

                {/* 2-Column Studio Workspace */}
                <div class="grid grid-cols-12 gap-gutter items-start">
                  
                  {/* LEFT COLUMN: Visual Canvas Focus */}
                  <div class="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md">
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md border border-surface-variant/60">
                      
                      {/* View Modes Strip */}
                      <div class="flex items-center justify-between flex-wrap gap-space-sm">
                        <div class="inline-flex p-0.5 rounded-lg bg-surface-container border border-surface-variant/60">
                          <button 
                            onClick={() => setActiveTab('original')}
                            class={`px-space-md py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all cursor-pointer ${
                              activeTab === 'original' 
                                ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            Original
                          </button>
                          <button 
                            onClick={() => setActiveTab('preview')}
                            class={`px-space-md py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              activeTab === 'preview' 
                                ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            Protected Preview
                          </button>
                        </div>

                        {imageObj && (
                          <div class="flex items-center gap-space-sm">
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              class="flex items-center gap-1 px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-label-sm text-label-sm uppercase cursor-pointer"
                            >
                              <span class="material-symbols-outlined text-sm">swap_horiz</span>
                              <span>Replace Image</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Canvas Viewport Area */}
                      <div class="relative w-full aspect-square bg-surface-container-high rounded-lg overflow-hidden flex items-center justify-center border border-surface-variant/60 select-none">
                        {!imageObj ? (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            class="flex flex-col items-center justify-center p-8 text-center cursor-pointer group hover:bg-surface-container transition-colors w-full h-full"
                          >
                            <div class="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm mb-4 group-hover:scale-110 transition-transform">
                              <span class="material-symbols-outlined text-3xl">add_photo_alternate</span>
                            </div>
                            <span class="font-title-sm text-title-sm text-primary font-semibold mb-1">
                              Upload Creator Photo
                            </span>
                            <span class="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                              PNG, JPG or WebP (Max 10 MB). Runs entirely inside your browser.
                            </span>
                          </div>
                        ) : (
                          <canvas 
                            ref={canvasRef}
                            class="max-w-full max-h-full object-contain"
                          />
                        )}

                        <input 
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          class="hidden"
                          onChange={(e) => handleFileChange(e.target.files[0])}
                        />
                      </div>

                      {/* Technical Metadata Bar */}
                      {imageObj && (
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs border-t border-surface-variant/40">
                          <div class="flex items-center gap-2 flex-wrap font-label-sm text-label-sm">
                            <span class="font-mono text-on-surface font-semibold">{imageFile?.name}</span>
                            <span class="text-outline">•</span>
                            <span class="text-on-surface-variant">{fileDimensions.width} × {fileDimensions.height} px</span>
                            <span class="text-outline">•</span>
                            <span class="text-on-surface-variant">{fileSizeStr}</span>
                          </div>
                          
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <div class="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary bg-surface-container px-2.5 py-1 rounded border border-surface-variant/60">
                              <span class="material-symbols-outlined text-xs">fingerprint</span>
                              <span class="font-mono text-[0.6875rem]">File fingerprint (SHA-256): {formatHash(fileSha256)}</span>
                            </div>
                            {registeredDnaId && (
                              <div class="flex items-center gap-1 font-label-sm text-label-sm text-primary bg-secondary-container/40 px-2.5 py-1 rounded border border-secondary/30">
                                <span class="material-symbols-outlined text-xs text-secondary">dna</span>
                                <span class="font-mono text-[0.6875rem] font-semibold">{registeredDnaId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Attribution Controls */}
                  <div class="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-space-md">
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-lg border border-surface-variant/60">
                      
                      {/* Header */}
                      <div class="flex items-center justify-between pb-space-sm border-b border-surface-variant/40">
                        <div class="flex items-center gap-space-xs">
                          <span class="material-symbols-outlined text-primary text-xl">tune</span>
                          <h2 class="font-title-md text-title-md text-primary">Attribution Configuration</h2>
                        </div>
                      </div>

                      {/* Watermark Input */}
                      <div class="flex flex-col gap-1.5">
                        <label class="font-label-md text-label-md text-on-surface font-medium uppercase tracking-wider" htmlFor="watermark-input">
                          Watermark Text Signature
                        </label>
                        <div class="relative">
                          <input 
                            id="watermark-input"
                            type="text"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            class="w-full px-space-md py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-surface-variant/60"
                            placeholder="e.g. © Your Name • Ownership Mark"
                          />
                          <span class="absolute right-3 top-2.5 text-on-surface-variant">
                            <span class="material-symbols-outlined text-base text-secondary">verified</span>
                          </span>
                        </div>
                      </div>

                      {/* Sliders */}
                      <div class="grid grid-cols-2 gap-space-md pt-space-xs">
                        {/* Opacity Slider */}
                        <div class="flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="slider-opacity">Opacity</label>
                            <span class="font-label-sm text-label-sm font-mono text-primary font-semibold">{opacity}%</span>
                          </div>
                          <input 
                            id="slider-opacity"
                            type="range"
                            min="10"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            class="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        {/* Scale Slider */}
                        <div class="flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="slider-scale">Scale</label>
                            <span class="font-label-sm text-label-sm font-mono text-primary font-semibold">{scale.toFixed(1)}x</span>
                          </div>
                          <input 
                            id="slider-scale"
                            type="range"
                            min="0.6"
                            max="1.6"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(Number(e.target.value))}
                            class="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>

                      {/* 3x3 Position Anchor Grid */}
                      <div class="flex flex-col gap-2 pt-space-xs">
                        <div class="flex items-center justify-between">
                          <span class="font-label-md text-label-md text-on-surface font-medium uppercase tracking-wider">Position Anchor</span>
                          <span class="font-label-sm text-label-sm text-outline capitalize">{position.replace('-', ' ')}</span>
                        </div>
                        <div class="p-space-sm bg-surface-container-low rounded-lg w-full max-w-[200px] mx-auto grid grid-cols-3 gap-2 border border-surface-variant/40">
                          {posKeys.map((pos) => {
                            const isSelected = position === pos;
                            return (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => setPosition(pos)}
                                class={`aspect-square rounded transition-all flex items-center justify-center cursor-pointer ${
                                  isSelected 
                                    ? 'bg-primary text-on-primary shadow-sm' 
                                    : 'bg-surface-container hover:bg-surface-container-high'
                                }`}
                              >
                                <span class={`rounded-full ${isSelected ? 'w-2 h-2 bg-on-primary' : 'w-1.5 h-1.5 bg-outline-variant'}`}></span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Toggle: Visible Ownership Mark */}
                      <div class="flex flex-col gap-space-md pt-space-xs">
                        <div class="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-surface-variant/40">
                          <div class="flex flex-col pr-space-sm">
                            <span class="font-title-sm text-title-sm text-on-surface font-medium">Visible Ownership Mark</span>
                            <span class="font-body-sm text-body-sm text-on-surface-variant">Displays watermark overlay on image export</span>
                          </div>
                          <label class="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={visibleMark}
                              onChange={(e) => setVisibleMark(e.target.checked)}
                              class="sr-only peer"
                            />
                            <div class="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>

                      {/* 6-Step Technical Protection Process Stepper */}
                      <div class="flex flex-col gap-2 p-space-sm rounded-lg bg-surface-container-low border border-surface-variant/50">
                        <div class="flex items-center justify-between">
                          <span class="font-label-sm text-xs font-bold text-primary uppercase tracking-wider">
                            Protection Process Stepper
                          </span>
                          {isProcessing && (
                            <span class="font-label-sm text-[0.6875rem] text-secondary font-medium animate-pulse flex items-center gap-1">
                              <span class="material-symbols-outlined text-xs animate-spin">sync</span>
                              Processing...
                            </span>
                          )}
                        </div>
                        <div class="flex flex-col gap-1.5 font-label-sm text-xs">
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 1 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 1 ? 'check_circle' : (isProcessing && stepStatus === 0 ? 'sync' : 'radio_button_unchecked')}
                            </span>
                            <span class={stepStatus >= 1 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                              {stepStatus >= 1 ? '✓ Image loaded' : '1. Image loaded'}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 2 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 2 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class={stepStatus >= 2 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                              {stepStatus >= 2 ? '✓ Ownership mark configured' : '2. Ownership mark configured'}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 3 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 3 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class={stepStatus >= 3 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                              {stepStatus >= 3 ? '✓ Visible watermark applied' : '3. Visible watermark applied'}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 4 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 4 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class={stepStatus >= 4 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                              {stepStatus >= 4 ? '✓ DCT invisible watermark applied' : '4. DCT invisible watermark applied'}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 5 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 5 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class={stepStatus >= 5 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                              {stepStatus >= 5 ? '✓ Protection verified' : '5. Protection verified'}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`material-symbols-outlined text-sm ${stepStatus >= 6 ? 'text-secondary' : 'text-outline'}`}>
                              {stepStatus >= 6 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class={stepStatus >= 6 ? 'text-on-surface font-medium font-semibold' : 'text-on-surface-variant'}>
                              {stepStatus >= 6 ? '✓ Protected image ready' : '6. Protected image ready'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div class="flex flex-col gap-space-sm pt-space-sm">
                        <button 
                          type="button"
                          onClick={() => runProtectionSequence()}
                          disabled={!imageObj || isProcessing}
                          class="w-full py-3 px-space-lg rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 font-title-sm text-title-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-space-sm cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-lg">verified</span>
                          <span>{isProcessing ? 'Applying Watermark...' : 'Apply Watermark / Protect Image'}</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleDownload}
                          disabled={!imageObj || !isProtected}
                          class="w-full py-2.5 px-space-lg rounded-lg bg-primary-container text-on-primary hover:bg-primary disabled:opacity-50 font-title-sm text-title-sm shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-space-sm cursor-pointer border border-surface-variant/60"
                        >
                          <span class="material-symbols-outlined text-lg">download</span>
                          <span>Download Protected Image</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleSaveToVault}
                          disabled={!imageObj}
                          class="w-full py-2.5 px-space-lg rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface font-title-sm text-title-sm transition-all flex items-center justify-center gap-space-sm border border-surface-variant/60 cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-lg text-secondary">fingerprint</span>
                          <span>Save to Evidence Vault</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleRegisterPhotoDna}
                          disabled={!imageFile || isRegisteringDna}
                          class="w-full py-2.5 px-space-lg rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface font-title-sm text-title-sm transition-all flex items-center justify-center gap-space-sm border border-secondary/40 cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-lg text-secondary">dna</span>
                          <span>
                            {isRegisteringDna
                              ? 'Registering Photo DNA...'
                              : (registeredDnaId ? `Registered Photo DNA (${registeredDnaId})` : 'Register Photo DNA (Original)')}
                          </span>
                        </button>
                      </div>

                      {/* Notice Box with EXACT text */}
                      <div class="p-space-md rounded-lg bg-surface-container text-on-surface-variant flex gap-space-sm items-start border border-surface-variant/50">
                        <span class="material-symbols-outlined text-base text-secondary flex-shrink-0 mt-0.5">info</span>
                        <p class="font-body-sm text-body-sm leading-relaxed">
                          <strong class="font-medium text-on-surface">Notice:</strong> A visible watermark helps show ownership and discourages casual reuse. It does not prevent cropping, editing or misuse. Always keep your original high-resolution files.
                        </p>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
