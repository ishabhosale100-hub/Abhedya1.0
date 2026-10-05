import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function IntroPage() {
  const navigate = useNavigate();

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
      <main class="w-full max-w-7xl mx-auto px-margin py-space-xl">
        <div class="flex flex-col w-full">
          <div class="relative w-full min-h-[82vh] flex flex-col justify-between items-center py-space-xl px-margin select-none">
            {/* Top System Metadata Bar */}
            <header class="w-full max-w-4xl flex items-center justify-between opacity-80 transition-opacity duration-700 hover:opacity-100">
              <div class="flex items-center gap-space-sm">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Archival Standard
                </span>
              </div>
              <div class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant flex items-center gap-space-md">
                <span>Local session</span>
                <span class="text-outline-variant font-mono">/</span>
                <span>Prototype</span>
              </div>
            </header>

            {/* Central Hero & Editorial Spine */}
            <div class="w-full max-w-2xl flex flex-col items-center text-center my-auto py-space-lg">
              {/* Brand Geometric Logo Mark */}
              <div class="relative mb-space-xl group flex items-center justify-center">
                <div class="absolute -inset-6 rounded-full bg-secondary-container/15 blur-xl transition-all duration-700 group-hover:bg-secondary-container/25"></div>
                <div class="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-full bg-surface-container-low border border-surface-variant/60 shadow-sm p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" class="w-full h-full">
                    <circle cx="50" cy="50" r="42" stroke="#260921" strokeWidth="2.5" strokeOpacity="0.9"/>
                    <circle cx="50" cy="50" r="32" stroke="#785463" strokeWidth="1.8" strokeDasharray="4 3"/>
                    <circle cx="50" cy="50" r="20" stroke="#260921" strokeWidth="2"/>
                    <rect x="47.5" y="47.5" width="5" height="5" fill="#260921"/>
                  </svg>
                </div>
              </div>

              {/* Core Brand Nomenclature */}
              <div class="space-y-space-xs mb-space-md">
                <h1 class="font-display-hero text-display-hero text-primary tracking-tight font-normal">
                  ABHEDYA
                </h1>
                <p class="font-headline-sm text-headline-sm text-secondary italic font-normal tracking-normal max-w-md mx-auto">
                  Digital safety for your digital identity.
                </p>
              </div>

              {/* Editorial Narrative Separation */}
              <div class="w-12 h-px bg-outline-variant my-space-md opacity-60"></div>

              {/* Supporting Editorial Subtext */}
              <p class="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto tracking-normal leading-relaxed mb-space-xl">
                Protect your images. Detect digital threats. Preserve what matters. An AI-assisted digital safety platform for women creators.
              </p>

              {/* Primary Gateway Action Area */}
              <div class="flex flex-col items-center gap-space-md w-full max-w-xs">
                <button 
                  onClick={() => navigate('/login')}
                  aria-label="Get Started with Abhedya" 
                  class="w-full py-3.5 px-8 rounded bg-primary-container text-surface-bright font-title-sm text-title-sm font-medium tracking-wide shadow-sm hover:bg-primary transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer" 
                  id="get-started-btn"
                >
                  <span>Get Started</span>
                  <span class="material-symbols-outlined text-[18px] text-primary-fixed-dim transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </button>
                <span class="font-label-md text-label-md text-on-surface-variant/70 tracking-wider">
                  Your digital presence. Your control.
                </span>
              </div>
            </div>

            {/* True Archival Footer */}
            <footer class="w-full max-w-3xl pt-space-lg flex flex-col sm:flex-row items-center justify-between text-center gap-y-space-xs">
              <div class="w-full flex items-center justify-center gap-3 sm:gap-4 flex-wrap font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                <span>Designed for Independent Creators</span>
                <span class="hidden sm:inline text-outline-variant">•</span>
                <span>Browser-First Safety</span>
                <span class="hidden sm:inline text-outline-variant">•</span>
                <span>Prototype</span>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
