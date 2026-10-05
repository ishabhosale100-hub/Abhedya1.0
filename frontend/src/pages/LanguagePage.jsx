import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLanguage, setLanguage } from '../utils/i18n';

export default function LanguagePage() {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState(getLanguage());

  const handleSelect = (lang) => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  const handleContinue = () => {
    setLanguage(selectedLang);
    navigate('/workspace');
  };

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
      <main class="w-full max-w-7xl mx-auto px-margin py-space-xl">
        <div class="flex flex-col w-full items-center justify-center py-space-xl px-gutter-mobile md:px-0">
          <div class="relative w-full max-w-lg">
            {/* Subtle Watermark Circles */}
            <div class="absolute -top-16 -left-16 w-56 h-56 pointer-events-none opacity-40">
              <svg class="w-full h-full text-outline-variant" fill="none" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="30" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.75"></circle>
                <circle cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="0.75"></circle>
                <circle cx="100" cy="100" r="78" stroke="currentColor" strokeDasharray="4 6" strokeWidth="0.75"></circle>
                <circle cx="100" cy="100" r="102" stroke="currentColor" strokeWidth="0.75"></circle>
              </svg>
            </div>

            {/* Main Card */}
            <div class="relative bg-surface-container-lowest shadow-md rounded-xl p-space-lg md:p-space-xl">
              {/* Archival Header */}
              <div class="flex items-center justify-between pb-space-md mb-space-lg bg-surface-container-low px-space-md py-space-xs rounded-lg">
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  SYS.LOCALE // SETUP
                </span>
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">PREFERENCE</span>
              </div>

              {/* Title */}
              <div class="space-y-space-xs mb-space-xl">
                <h1 class="font-headline-md text-headline-md text-primary tracking-tight">
                  Choose your language
                </h1>
                <p class="font-body-md text-body-md text-on-surface-variant">
                  Select the language you are most comfortable using.
                </p>
              </div>

              {/* Options */}
              <div class="space-y-space-sm mb-space-xl">
                {/* Option 1: English */}
                <label 
                  onClick={() => handleSelect('en')}
                  class={`group relative flex items-center justify-between p-space-md rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedLang === 'en' ? 'bg-secondary-container/20 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input 
                    type="radio"
                    name="preferred_locale"
                    value="en"
                    checked={selectedLang === 'en'}
                    onChange={() => handleSelect('en')}
                    class="sr-only"
                  />
                  <div class="flex flex-col min-w-0 pr-space-md">
                    <span class={`font-title-md text-title-md tracking-tight ${selectedLang === 'en' ? 'text-primary' : 'text-on-surface'}`}>
                      English
                    </span>
                    <span class={`font-label-md text-label-md mt-0.5 ${selectedLang === 'en' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      International English
                    </span>
                  </div>
                  <div class={`flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0 ${
                    selectedLang === 'en' ? 'bg-primary-container text-surface' : 'bg-surface-container-highest text-transparent'
                  }`}>
                    <span class="material-symbols-outlined text-[16px] leading-none">check</span>
                  </div>
                </label>

                {/* Option 2: Hindi */}
                <label 
                  onClick={() => handleSelect('hi')}
                  class={`group relative flex items-center justify-between p-space-md rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedLang === 'hi' ? 'bg-secondary-container/20 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input 
                    type="radio"
                    name="preferred_locale"
                    value="hi"
                    checked={selectedLang === 'hi'}
                    onChange={() => handleSelect('hi')}
                    class="sr-only"
                  />
                  <div class="flex flex-col min-w-0 pr-space-md">
                    <span class={`font-title-md text-title-md tracking-tight ${selectedLang === 'hi' ? 'text-primary' : 'text-on-surface'}`} lang="hi">
                      हिन्दी
                    </span>
                    <span class={`font-label-md text-label-md mt-0.5 ${selectedLang === 'hi' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      Hindi
                    </span>
                  </div>
                  <div class={`flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0 ${
                    selectedLang === 'hi' ? 'bg-primary-container text-surface' : 'bg-surface-container-highest text-transparent'
                  }`}>
                    <span class="material-symbols-outlined text-[16px] leading-none">check</span>
                  </div>
                </label>

                {/* Option 3: Marathi */}
                <label 
                  onClick={() => handleSelect('mr')}
                  class={`group relative flex items-center justify-between p-space-md rounded-lg cursor-pointer transition-all duration-150 ${
                    selectedLang === 'mr' ? 'bg-secondary-container/20 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input 
                    type="radio"
                    name="preferred_locale"
                    value="mr"
                    checked={selectedLang === 'mr'}
                    onChange={() => handleSelect('mr')}
                    class="sr-only"
                  />
                  <div class="flex flex-col min-w-0 pr-space-md">
                    <span class={`font-title-md text-title-md tracking-tight ${selectedLang === 'mr' ? 'text-primary' : 'text-on-surface'}`} lang="mr">
                      मराठी
                    </span>
                    <span class={`font-label-md text-label-md mt-0.5 ${selectedLang === 'mr' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      Marathi
                    </span>
                  </div>
                  <div class={`flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0 ${
                    selectedLang === 'mr' ? 'bg-primary-container text-surface' : 'bg-surface-container-highest text-transparent'
                  }`}>
                    <span class="material-symbols-outlined text-[16px] leading-none">check</span>
                  </div>
                </label>
              </div>

              {/* Action */}
              <div class="space-y-space-md pt-space-xs">
                <button 
                  onClick={handleContinue}
                  class="w-full h-12 flex items-center justify-center gap-space-xs bg-primary-container hover:bg-primary active:scale-[0.99] text-surface font-title-sm text-title-sm rounded-lg shadow-sm transition-all duration-150 group cursor-pointer"
                  type="button"
                >
                  <span>Continue</span>
                  <span class="material-symbols-outlined text-[18px] transition-transform duration-150 group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </button>

                <div class="flex items-start gap-space-sm px-space-xs py-space-xs">
                  <span class="material-symbols-outlined text-secondary text-[18px] mt-0.5 flex-shrink-0">
                    verified_user
                  </span>
                  <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    You can update your language preferences anytime from the top bar.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div class="flex items-center justify-between mt-space-md px-space-sm text-on-surface-variant/70">
              <span class="font-label-sm text-label-sm uppercase tracking-widest">LOCALE PROFILE</span>
              <span class="font-label-sm text-label-sm font-mono tracking-tighter">I18N SUPPORTED</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
