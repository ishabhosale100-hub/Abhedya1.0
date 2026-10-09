import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getEvidenceStats, calculateCreatorSafetyScore } from '../services/evidenceStore';
import { t } from '../utils/i18n';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalRecords: 0, criticalCount: 0, flaggedCommentsCount: 0 });
  const [safetyScoreData, setSafetyScoreData] = useState(null);
  const [nowStr, setNowStr] = useState('');

  useEffect(() => {
    setStats(getEvidenceStats());
    setSafetyScoreData(calculateCreatorSafetyScore());
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
    <div className="bg-surface font-body-md text-on-surface antialiased">
      <Header />
      <Sidebar />

      <div className="pl-64">
        <main className="w-full pt-16 bg-surface min-h-screen">
          <div className="w-full px-margin py-space-lg">
            <div className="grid grid-cols-12 gap-gutter w-full">
              <div className="flex flex-col w-full col-span-12 gap-space-xl">
                {/* Hero Section */}
                <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
                  <div className="flex flex-col max-w-3xl">
                    <div className="flex items-center gap-space-sm mb-space-sm">
                      <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm tracking-widest uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Creator Safety Active
                      </span>
                      <span className="font-label-sm text-label-sm text-outline font-mono">
                        {nowStr}
                      </span>
                    </div>
                    <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                      {t('heroTitle')}
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs font-normal">
                      {t('heroSub')}
                    </p>
                  </div>

                  {/* Real Security Posture Box */}
                  <div className="flex items-center">
                    <div className="bg-surface-container-low px-space-md py-space-sm rounded-lg shadow-sm flex items-center gap-space-md border border-surface-variant/60">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary-container"></div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm uppercase text-outline leading-none">Security Posture</span>
                        <span className="font-title-sm text-title-sm text-on-surface mt-0.5 font-medium">
                          {username}: Active • {stats.totalRecords} Saved Record{stats.totalRecords === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Creator Safety Risk Indicator Widget */}
                {safetyScoreData && (
                  <section 
                    role="button"
                    tabIndex={0}
                    aria-label={`Creator Risk Indicator: ${safetyScoreData.status}. Click or press Enter to view Evidence Vault.`}
                    onClick={() => navigate('/evidence-vault')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/evidence-vault');
                      }
                    }}
                    className="w-full bg-surface-container-lowest rounded-xl p-space-lg border border-surface-variant/60 shadow-sm hover:shadow-md hover:border-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 cursor-pointer flex flex-col gap-space-md"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                      <div className="flex items-center gap-space-md">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-headline-md font-bold ${
                          safetyScoreData.score === null 
                            ? 'bg-surface-container-high text-on-surface-variant'
                            : safetyScoreData.score >= 75 
                            ? 'bg-error-container text-on-error-container'
                            : safetyScoreData.score >= 50
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}>
                          {safetyScoreData.score !== null ? safetyScoreData.score : '—'}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-space-xs">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Creator Risk Indicator</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono">
                              {safetyScoreData.evidenceCoverage.totalRecords} Saved Record{safetyScoreData.evidenceCoverage.totalRecords === 1 ? '' : 's'}
                            </span>
                          </div>
                          <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
                            {safetyScoreData.status}
                          </h2>
                        </div>
                      </div>

                      <div className="text-xs text-on-surface-variant max-w-md bg-surface-container-low p-space-sm rounded-lg border border-surface-variant/40">
                        <span className="font-semibold block mb-0.5 text-outline">Contributing Factors:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {safetyScoreData.contributingFactors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-space-xs border-t border-surface-variant/40 flex items-center justify-between text-label-sm font-label-sm text-outline">
                      <span>Disclaimer: {safetyScoreData.disclaimer}</span>
                    </div>
                  </section>
                )}

                {/* 4 Core Module Cards */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter w-full">
                  {/* Module 1: Photo Protection */}
                  <article 
                    onClick={() => navigate('/photo-protection')}
                    className="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex flex-col relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">01</span>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span className="material-symbols-outlined text-xl">shield</span>
                        </div>
                      </div>
                      <div className="mt-space-xl">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Provenance</span>
                        <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight">PHOTO PROTECTION</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Protect ownership before sharing your images. Apply visible watermarks and generate SHA-256 fingerprints.
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>ENGINE</span>
                        <span className="text-secondary font-medium font-mono">RUNS IN BROWSER</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full w-full"></div>
                      </div>
                      <div className="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span className="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 2: Image Investigation */}
                  <article 
                    onClick={() => navigate('/image-investigation')}
                    className="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex flex-col relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">02</span>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span className="material-symbols-outlined text-xl">saved_search</span>
                        </div>
                      </div>
                      <div className="mt-space-xl">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Forensic Diff</span>
                        <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight">IMAGE INVESTIGATION</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Compare images and identify visual differences using per-pixel delta analysis and heatmap overlays.
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>ENGINE</span>
                        <span className="text-secondary font-medium font-mono">RUNS IN BROWSER</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full w-full"></div>
                      </div>
                      <div className="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span className="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 3: Comment Safety */}
                  <article 
                    onClick={() => navigate('/comment-safety')}
                    className="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex flex-col relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">03</span>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span className="material-symbols-outlined text-xl">forum</span>
                        </div>
                      </div>
                      <div className="mt-space-xl">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Harm Analysis</span>
                        <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight">COMMENT SAFETY</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Scan pasted comments for threats, harassment, abusive text and PII exposure using AI models and rule engines.
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>MODEL</span>
                        <span className="text-secondary font-medium font-mono">AI + RULES</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full w-full"></div>
                      </div>
                      <div className="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span className="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
                      </div>
                    </div>
                  </article>

                  {/* Module 4: Evidence Vault */}
                  <article 
                    onClick={() => navigate('/evidence-vault')}
                    className="group relative bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[380px] overflow-hidden cursor-pointer border border-surface-variant/60"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-low opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex flex-col relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-secondary tracking-widest uppercase font-semibold">04</span>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
                          <span className="material-symbols-outlined text-xl">fingerprint</span>
                        </div>
                      </div>
                      <div className="mt-space-xl">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline block mb-1">Module // Archival Vault</span>
                        <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight">EVIDENCE VAULT</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm leading-relaxed">
                          Organize saved evidence records, edit notes, inspect SHA-256 fingerprints, and generate incident PDF reports.
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 pt-space-lg flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span>STORAGE</span>
                        <span className="text-secondary font-medium font-mono">STORED LOCALLY ({stats.totalRecords})</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full w-full"></div>
                      </div>
                      <div className="mt-space-sm flex items-center text-primary group-hover:text-primary-container font-title-sm text-title-sm transition-colors">
                        <span>Open Workspace</span>
                        <span className="material-symbols-outlined text-base ml-1 transform group-hover:translate-x-1.5 transition-transform duration-200">arrow_forward</span>
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