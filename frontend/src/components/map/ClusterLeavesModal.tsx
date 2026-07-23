'use client';

import React from 'react';
import { CATEGORY_ICON_MAP } from '@/components/ui/Icon';

interface ClusterLeavesModalProps {
  issues: any[];
  onClose: () => void;
  onSelectIssue: (issue: any) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
  OTHER: 'Diğer',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  OPEN:      { label: 'Açık', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  IN_REVIEW: { label: 'İnceleniyor', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  RESOLVED:  { label: 'Çözüldü', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  REJECTED:  { label: 'Reddedildi', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400' },
};

export function ClusterLeavesModal({ issues, onClose, onSelectIssue }: ClusterLeavesModalProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Başlık */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-800/50 dark:to-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              {issues.length}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Küme İçi Bildirim Listesi
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bu konumda üst üste bulunan veya yakın ihbarlar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liste */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-gray-100 dark:divide-gray-800/60">
          {issues.map((issue, idx) => {
            const IconComponent = CATEGORY_ICON_MAP[issue.category];
            const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
            return (
              <div
                key={issue.id || idx}
                onClick={() => {
                  onSelectIssue(issue);
                  onClose();
                }}
                className="pt-3 first:pt-0 cursor-pointer group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 p-3 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                    {IconComponent ? <IconComponent size={18} /> : <span>●</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                        {CATEGORY_LABELS[issue.category] || issue.category}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {issue.title || 'Başlıksız Bildirim'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {issue.city && issue.district ? `${issue.district}, ${issue.city}` : issue.address || 'Konum belirtilmemiş'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alt Bilgi */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
          Detayları görmek veya desteklemek için listedeki bir ihbara tıklayın.
        </div>
      </div>
    </div>
  );
}
