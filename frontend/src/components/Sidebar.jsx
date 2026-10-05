import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { t } from '../utils/i18n';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    {
      path: '/workspace',
      label: t('workspace'),
      icon: 'grid_view',
    },
    {
      path: '/photo-protection',
      label: t('photoProtection'),
      icon: 'shield',
    },
    {
      path: '/image-investigation',
      label: t('imageInvestigation'),
      icon: 'saved_search',
    },
    {
      path: '/comment-safety',
      label: t('commentSafety'),
      icon: 'forum',
    },
    {
      path: '/evidence-vault',
      label: t('evidenceVault'),
      icon: 'fingerprint',
    },
  ];

  return (
    <aside class="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-low border-r border-surface-variant z-40 flex flex-col justify-between p-space-md">
      <div class="flex flex-col gap-space-lg">
        <div class="px-space-sm pt-space-xs">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block font-medium">
            {t('dossierModules')}
          </span>
        </div>
        
        <nav class="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/workspace' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                class={({ isActive: isLinkActive }) => {
                  const active = isActive || isLinkActive;
                  return active
                    ? "flex items-center gap-space-sm px-space-md py-space-sm rounded transition-colors bg-primary text-on-primary font-medium shadow-xs"
                    : "flex items-center gap-space-sm px-space-md py-space-sm rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-body-sm text-body-sm";
                }}
              >
                <span class="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Chain of Custody Stamp */}
      <div class="flex flex-col gap-space-sm border-t border-surface-variant pt-space-md">
        <div class="px-space-sm">
          <span class="font-label-sm text-label-sm text-outline uppercase block">
            {t('chainOfCustody')}
          </span>
          <span class="font-label-sm text-[0.6875rem] text-on-surface-variant block mt-0.5 font-medium">
            {t('recordsInBrowser')}
          </span>
        </div>
      </div>
    </aside>
  );
}
