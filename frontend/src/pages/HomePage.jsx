import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getEvidenceStats } from '../services/evidenceStore';
import { t } from '../utils/i18n';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalRecords: 0, criticalCount: 0, flaggedCommentsCount: 0 });
  const [nowStr, setNowStr] = useState('');

  useEffect(() => {
    setStats(getEvidenceStats());
    const updateTime = () => {
      const now = new Date();
      setNowStr(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const username = localStorage.getItem('abhedya_user_name') || 'Demo User';

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div class="pl-64">
        <main class="w-full pt-16 bg-surface min-h-screen">
          <div class="w-full px-margin py-space-lg">
            <div class="grid grid-cols-12 gap-gutter w-full">
              <div class="flex flex-col w-full col-span-12 gap-space-xl">
                {/* Hero Section */}
                <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
                  <div class="flex flex-col max-w-3xl">
                    <div class="flex items-center gap-space-sm mb-space-sm">
                      <span class="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm tracking-widest uppercase">
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Creator Safety Active
                      </span>
                      <span class="font-label-sm text-label-sm text-outline font-mono">
                        {nowStr}
                      </span>
                    </div>
                    <h1 class="font-headline-lg text-headline-lg text-primary tracking-tight">
                      {t('heroTitle')}
                    </h1>
                    <p class="font-body-lg text-body-lg text-on-surface-variant mt-space-xs font-normal">
                      {t('heroSub')}
                    </p>
                  </div>

                  {/* Real Security Posture Box */}
                  <div class="flex items-center">
                    <div class="bg-surface-container-low px-space-md py-space-sm rounded-lg shadow-sm flex items-center gap-space-md border border-surface-variant/60">
                      <div class="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary-container"></div>
                      <div class="flex flex-col">
                        <span class="font-label-sm text-label-sm uppercase text-outline leading-none">Security Posture</span>
                        <span class="font-title-sm text-title-sm text-on-surface mt-0.5 font-medium">
                          {username}: Active • {stats.totalRecords} Saved Record{stats.totalRecords === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4 Core Module Cards */}
                <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter w-full">
                  {/* Module 1: Photo Protection */}
                  <article 
                    onClick={() => navigate('/photo-protection')}
                    class="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div class="flex flex-col relative z-10">
                      <div class="flex items-center justify-between">
                        <span class="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">01</span>
                        <div class="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span class="material-symbols-outlined text-xl">shield</span>
                        </div>
                      </div>
                      <div class="mt-space-xl">
                        <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Provenance</span>
                        <h2 class="font-headline-sm text-headline-sm text-primary tracking-tight">PHOTO PROTECTION</h2>
                        <p class="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Protect ownership before sharing your images. Apply visible watermarks and generate SHA-256 fingerprints.
                        </p>
                      </div>
                    </div>
                    <div class="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div class="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>ENGINE</span>
                        <span class="text-secondary font-medium font-mono">RUNS IN BROWSER</span>
                      </div>
                      <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div class="bg-secondary h-full w-full"></div>
                      </div>
                      <div class="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span class="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 2: Image Investigation */}
                  <article 
                    onClick={() => navigate('/image-investigation')}
                    class="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div class="flex flex-col relative z-10">
                      <div class="flex items-center justify-between">
                        <span class="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">02</span>
                        <div class="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span class="material-symbols-outlined text-xl">saved_search</span>
                        </div>
                      </div>
                      <div class="mt-space-xl">
                        <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Forensic Diff</span>
                        <h2 class="font-headline-sm text-headline-sm text-primary tracking-tight">IMAGE INVESTIGATION</h2>
                        <p class="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Compare images and identify visual differences using per-pixel delta analysis and heatmap overlays.
                        </p>
                      </div>
                    </div>
                    <div class="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div class="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>ENGINE</span>
                        <span class="text-secondary font-medium font-mono">RUNS IN BROWSER</span>
                      </div>
                      <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div class="bg-secondary h-full w-full"></div>
                      </div>
                      <div class="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span class="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 3: Comment Safety */}
                  <article 
                    onClick={() => navigate('/comment-safety')}
                    class="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div class="flex flex-col relative z-10">
                      <div class="flex items-center justify-between">
                        <span class="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">03</span>
                        <div class="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span class="material-symbols-outlined text-xl">forum</span>
                        </div>
                      </div>
                      <div class="mt-space-xl">
                        <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Harm Analysis</span>
                        <h2 class="font-headline-sm text-headline-sm text-primary tracking-tight">COMMENT SAFETY</h2>
                        <p class="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Scan pasted comments for threats, harassment, abusive text and PII exposure using AI models and rule engines.
                        </p>
                      </div>
                    </div>
                    <div class="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div class="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>MODEL</span>
                        <span class="text-secondary font-medium font-mono">AI + RULES</span>
                      </div>
                      <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div class="bg-secondary h-full w-full"></div>
                      </div>
                      <div class="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span class="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 4: Evidence Vault */}
                  <article 
                    onClick={() => navigate('/evidence-vault')}
                    class="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div class="flex flex-col relative z-10">
                      <div class="flex items-center justify-between">
                        <span class="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">04</span>
                        <div class="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span class="material-symbols-outlined text-xl">fingerprint</span>
                        </div>
                      </div>
                      <div class="mt-space-xl">
                        <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Archival Vault</span>
                        <h2 class="font-headline-sm text-headline-sm text-primary tracking-tight">EVIDENCE VAULT</h2>
                        <p class="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Organize saved evidence records, edit notes, inspect SHA-256 fingerprints, and generate incident PDF reports.
                        </p>
                      </div>
                    </div>
                    <div class="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div class="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>STORAGE</span>
                        <span class="text-secondary font-medium font-mono">STORED LOCALLY ({stats.totalRecords})</span>
                      </div>
                      <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div class="bg-secondary h-full w-full"></div>
                      </div>
                      <div class="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span class="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
