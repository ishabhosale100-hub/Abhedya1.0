import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('creator@abhedya.demo');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const nameStr = identifier.split('@')[0] || 'Demo User';
    const cleanName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    
    localStorage.setItem('abhedya_logged_in', 'true');
    localStorage.setItem('abhedya_user_name', cleanName);
    
    // Navigate to Language page first per prompt flow: Intro -> Login -> Language -> Home
    navigate('/language');
  };

  const handleDemoUser = () => {
    setIdentifier('creator.demo@abhedya.org');
    setPassword('demo-session-key');
    localStorage.setItem('abhedya_logged_in', 'true');
    localStorage.setItem('abhedya_user_name', 'Demo User');
    setTimeout(() => {
      navigate('/language');
    }, 200);
  };

  return (
    <div class="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
      <main class="w-full max-w-7xl mx-auto px-margin py-space-xl">
        <div class="flex flex-col w-full items-center justify-center py-space-xl">
          <div class="w-full max-w-md mx-auto flex flex-col items-center">
            {/* Top Telemetry Stamp */}
            <div class="flex items-center gap-space-sm mb-space-xl px-space-md py-space-xs rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm tracking-widest uppercase">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>LOCAL DIGITAL SAFETY SESSION</span>
            </div>

            {/* Core Form Card */}
            <div class="w-full bg-surface-container-lowest p-8 md:p-10 rounded shadow-md relative overflow-hidden">
              <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-primary-container/5 to-transparent pointer-events-none"></div>

              {/* Identity Header */}
              <div class="flex flex-col items-center text-center mb-space-xl relative z-10">
                <div class="w-16 h-16 mb-space-md flex items-center justify-center p-2 rounded bg-surface-container-low shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" class="w-12 h-12">
                    <circle cx="50" cy="50" r="42" stroke="#260921" strokeWidth="2.5" strokeOpacity="0.9"/>
                    <circle cx="50" cy="50" r="32" stroke="#785463" strokeWidth="1.8" strokeDasharray="4 3"/>
                    <circle cx="50" cy="50" r="20" stroke="#260921" strokeWidth="2"/>
                    <rect x="47.5" y="47.5" width="5" height="5" fill="#260921"/>
                  </svg>
                </div>
                <h1 class="font-headline-md text-headline-md text-primary tracking-tight mb-space-xs">
                  Welcome to Abhedya
                </h1>
                <p class="font-body-md text-body-md text-secondary">
                  Secure your digital safety workspace.
                </p>
              </div>

              {/* Form */}
              <form class="flex flex-col space-y-space-lg relative z-10" onSubmit={handleLogin}>
                {/* Email Input */}
                <div class="flex flex-col space-y-space-xs">
                  <div class="flex justify-between items-center">
                    <label class="font-label-md text-label-md text-primary uppercase tracking-wider" htmlFor="identifier">
                      Identity or Email
                    </label>
                  </div>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
                      <span class="material-symbols-outlined text-[18px]">fingerprint</span>
                    </div>
                    <input 
                      id="identifier"
                      name="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      class="w-full bg-surface-container-low pl-10 pr-4 py-3 rounded font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all duration-200"
                      placeholder="e.g. creator@abhedya.demo"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div class="flex flex-col space-y-space-xs">
                  <div class="flex justify-between items-center">
                    <label class="font-label-md text-label-md text-primary uppercase tracking-wider" htmlFor="password">
                      Secret Passkey
                    </label>
                  </div>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
                      <span class="material-symbols-outlined text-[18px]">key</span>
                    </div>
                    <input 
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      class="w-full bg-surface-container-low pl-10 pr-11 py-3 rounded font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all duration-200"
                      placeholder="••••••••••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary hover:text-primary transition-colors focus:outline-none"
                    >
                      <span class="material-symbols-outlined text-[19px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Key Actions */}
                <div class="pt-space-xs flex flex-col space-y-space-sm">
                  <button 
                    type="submit"
                    class="w-full py-3.5 px-space-md rounded bg-primary-container text-on-primary font-title-sm text-title-sm shadow-md hover:bg-primary transition-all duration-150 flex items-center justify-center gap-space-sm active:scale-[0.99] cursor-pointer"
                  >
                    <span>Continue</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  <button 
                    type="button"
                    onClick={handleDemoUser}
                    class="w-full py-3 px-space-md rounded bg-surface-container text-primary font-title-sm text-title-sm shadow-sm hover:bg-surface-container-high transition-all duration-150 flex items-center justify-center gap-space-sm active:scale-[0.99] cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px] text-secondary">lab_profile</span>
                    <span>Continue as Demo User</span>
                  </button>
                </div>
              </form>

              {/* True Session Footer */}
              <div class="mt-space-lg pt-space-md bg-surface-container-low/50 -mx-8 -mb-8 md:-mx-10 md:-mb-10 px-8 py-4 flex items-center justify-between">
                <div class="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm">
                  <span class="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>LOCAL SESSION</span>
                </div>
                <div class="font-label-sm text-label-sm text-secondary font-mono">
                  BROWSER-ONLY
                </div>
              </div>
            </div>

            {/* True Footnote */}
            <div class="mt-space-lg flex flex-col items-center space-y-space-xs text-center">
              <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm tracking-wide pt-space-xs">
                <span class="material-symbols-outlined text-[14px] text-secondary">lock</span>
                <span>Designed for independent creators • Local browser session</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
