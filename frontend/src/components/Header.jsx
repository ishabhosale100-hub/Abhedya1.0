import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLanguage, setLanguage, t } from '../utils/i18n';

export default function Header() {
  const navigate = useNavigate();
  const [lang, setLangState] = useState(getLanguage());
  const username = localStorage.getItem('abhedya_user_name') || 'Demo User';

  const handleLangToggle = () => {
    const nextLang = lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en';
    setLanguage(nextLang);
    setLangState(nextLang);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('abhedya_logged_in');
    navigate('/login');
  };

  return (
    <header class="fixed top-0 left-0 right-0 z-50 h-16 bg-surface border-b border-surface-variant">
      <div class="w-full h-full px-margin flex items-center justify-between">
        {/* Brand identity mark */}
        <div class="flex items-center gap-space-lg">
          <div 
            class="flex items-center gap-space-md cursor-pointer"
            onClick={() => navigate('/workspace')}
          >
            <div class="w-8 h-8 rounded-sm bg-primary-container flex items-center justify-center text-on-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" class="w-6 h-6">
                <circle cx="50" cy="50" r="42" stroke="#FAF8F5" strokeWidth="3" strokeOpacity="0.9"/>
                <circle cx="50" cy="50" r="32" stroke="#B88E9E" strokeWidth="2.5" strokeDasharray="4 3"/>
                <circle cx="50" cy="50" r="20" stroke="#FAF8F5" strokeWidth="2.5"/>
                <rect x="47.5" y="47.5" width="5" height="5" fill="#FAF8F5"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-headline-sm text-headline-sm text-primary tracking-tight leading-none font-medium">
                {t('appName')}
              </span>
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-0.5">
                {t('appTagline')}
              </span>
            </div>
          </div>
          <div class="h-4 w-px bg-surface-variant hidden lg:block"></div>
          <div class="hidden lg:flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-sm text-outline">policy</span>
            <span>CREATOR DIGITAL SAFETY PLATFORM</span>
          </div>
        </div>

        {/* Right Status Controls */}
        <div class="flex items-center gap-space-md">
          <div class="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container border border-surface-variant">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span class="font-label-sm text-label-sm text-on-surface uppercase">{t('workspaceSecure')}</span>
          </div>

          <div class="h-4 w-px bg-surface-variant"></div>

          {/* Language Switch Button */}
          <button 
            onClick={handleLangToggle}
            class="px-space-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors uppercase font-semibold"
            type="button"
            title="Switch Language"
          >
            {lang.toUpperCase()}
          </button>

          <div class="h-4 w-px bg-surface-variant"></div>

          {/* Profile chip */}
          <div class="flex items-center gap-space-sm">
            <div class="w-8 h-8 rounded-full bg-primary-container text-surface flex items-center justify-center font-label-md text-xs font-semibold uppercase shadow-xs">
              {username.charAt(0)}
            </div>
            <div class="hidden md:flex flex-col text-left">
              <span class="font-label-md text-label-md text-on-surface font-semibold leading-tight">{username}</span>
              <span class="font-label-sm text-[0.6875rem] text-on-surface-variant leading-none">Creator Workspace</span>
            </div>
            <button 
              onClick={handleLogout}
              class="text-on-surface-variant hover:text-error p-1 rounded hover:bg-surface-container transition-colors ml-1"
              type="button"
              title="Sign Out"
            >
              <span class="material-symbols-outlined text-lg leading-none">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
